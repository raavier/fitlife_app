// Motor de sincronização offline-first com o Supabase.
//
// Modelo: uma única tabela remota `sync_registros` (user_id, tabela, uuid,
// data jsonb, updated_at, deleted) protegida por RLS. Cada linha espelha um
// registro local. Conflitos são resolvidos por last-write-wins (updatedEm
// local × updated_at remoto). Exclusões viajam como lápides (deleted=true).
//
// O IndexedDB continua sendo a fonte local: o app funciona 100% offline e
// sincroniza quando há sessão + rede.
import { comAplicacaoRemota, db, getConfig, registrarAoMudarLocal, setConfig, TABELAS_SYNC, type TabelaSync } from '../db/db';
import type { Sincronizavel } from '../db/types';
import { supabase } from './supabaseClient';

const TABELA_REMOTA = 'sync_registros';

export interface EstadoSync {
  status: 'desativado' | 'deslogado' | 'ocioso' | 'sincronizando' | 'erro';
  ultimaSync?: number;
  erro?: string;
}

let estado: EstadoSync = { status: 'desativado' };
const ouvintes = new Set<(e: EstadoSync) => void>();

function emitir(novo: Partial<EstadoSync>) {
  estado = { ...estado, ...novo };
  ouvintes.forEach((fn) => fn(estado));
}

export function assinarEstadoSync(fn: (e: EstadoSync) => void): () => void {
  ouvintes.add(fn);
  fn(estado);
  return () => ouvintes.delete(fn);
}

/** Decide se um registro remoto deve sobrescrever o local (last-write-wins). */
export function deveAplicarRemoto(localUpdatedEm: number | undefined, remotoUpdatedAt: string): boolean {
  if (localUpdatedEm === undefined) return true;
  return new Date(remotoUpdatedAt).getTime() > localUpdatedEm;
}

interface LinhaRemota {
  tabela: string;
  uuid: string;
  data: Record<string, unknown> | null;
  updated_at: string;
  deleted: boolean;
}

/** Prepara um registro local para subir: remove o id numérico (só local). */
export function paraRemoto(registro: Sincronizavel & { id?: number }): Record<string, unknown> {
  const { id: _id, ...resto } = registro;
  return resto;
}

let sincronizando = false;
let agendado: ReturnType<typeof setTimeout> | null = null;

/** Sincroniza tudo (pull + push). Segura chamadas concorrentes. */
export async function sincronizar(): Promise<void> {
  const sb = supabase();
  if (!sb) {
    emitir({ status: 'desativado' });
    return;
  }
  const { data: sess } = await sb.auth.getSession();
  const userId = sess.session?.user.id;
  if (!userId) {
    emitir({ status: 'deslogado' });
    return;
  }
  if (sincronizando) return;
  sincronizando = true;
  emitir({ status: 'sincronizando', erro: undefined });

  try {
    const chaveCursor = `sync_cursor_${userId}`;
    const cursor = await getConfig<{ pull: string; push: number }>(chaveCursor, {
      pull: '1970-01-01T00:00:00Z',
      push: 0,
    });
    const agora = Date.now();

    // ===== PULL: aplica mudanças remotas mais novas que o cursor =====
    const { data: remotos, error: erroPull } = await sb
      .from(TABELA_REMOTA)
      .select('tabela, uuid, data, updated_at, deleted')
      .gt('updated_at', cursor.pull)
      .order('updated_at', { ascending: true })
      .limit(2000);
    if (erroPull) throw new Error(`pull: ${erroPull.message}`);

    let maiorUpdatedAt = cursor.pull;
    await comAplicacaoRemota(async () => {
      for (const linha of (remotos ?? []) as LinhaRemota[]) {
        if (linha.updated_at > maiorUpdatedAt) maiorUpdatedAt = linha.updated_at;
        if (!TABELAS_SYNC.includes(linha.tabela as TabelaSync)) continue;
        const tabela = db.table(linha.tabela);
        const local = (await tabela.where('uuid').equals(linha.uuid).first()) as
          | (Sincronizavel & { id?: number })
          | undefined;

        if (linha.deleted) {
          if (local?.id !== undefined) await tabela.delete(local.id);
          continue;
        }
        if (!deveAplicarRemoto(local?.updatedEm, linha.updated_at)) continue; // local mais novo vence
        const registro = {
          ...(linha.data ?? {}),
          uuid: linha.uuid,
          updatedEm: new Date(linha.updated_at).getTime(),
        };
        if (local?.id !== undefined) await tabela.put({ ...registro, id: local.id });
        else await tabela.put(registro);
      }
    });

    // ===== PUSH: envia registros locais alterados desde o último push =====
    const paraSubir: { user_id: string; tabela: string; uuid: string; data: unknown; updated_at: string; deleted: boolean }[] = [];
    for (const tabela of TABELAS_SYNC) {
      const sujos = (await db
        .table(tabela)
        .where('updatedEm')
        .above(cursor.push)
        .toArray()) as (Sincronizavel & { id?: number })[];
      for (const r of sujos) {
        if (!r.uuid) continue;
        paraSubir.push({
          user_id: userId,
          tabela,
          uuid: r.uuid,
          data: paraRemoto(r),
          updated_at: new Date(r.updatedEm ?? agora).toISOString(),
          deleted: false,
        });
      }
    }
    const lapides = await db.tombstones.where('apagadoEm').above(cursor.push).toArray();
    for (const l of lapides) {
      paraSubir.push({
        user_id: userId,
        tabela: l.tabela,
        uuid: l.uuid,
        data: null,
        updated_at: new Date(l.apagadoEm).toISOString(),
        deleted: true,
      });
    }
    if (paraSubir.length > 0) {
      const { error: erroPush } = await sb
        .from(TABELA_REMOTA)
        .upsert(paraSubir, { onConflict: 'user_id,tabela,uuid' });
      if (erroPush) throw new Error(`push: ${erroPush.message}`);
    }

    await setConfig(chaveCursor, { pull: maiorUpdatedAt, push: agora });
    emitir({ status: 'ocioso', ultimaSync: Date.now() });
  } catch (e) {
    emitir({ status: 'erro', erro: e instanceof Error ? e.message : String(e) });
  } finally {
    sincronizando = false;
  }
}

function agendarSync(atrasoMs = 4000) {
  if (agendado) clearTimeout(agendado);
  agendado = setTimeout(() => {
    agendado = null;
    void sincronizar();
  }, atrasoMs);
}

/** Liga os gatilhos automáticos: login/logout, volta da rede e escritas locais. */
export function iniciarAutoSync(): void {
  const sb = supabase();
  if (!sb) {
    emitir({ status: 'desativado' });
    return;
  }
  registrarAoMudarLocal(() => agendarSync());
  window.addEventListener('online', () => agendarSync(1000));
  sb.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_IN' || evento === 'INITIAL_SESSION' || evento === 'TOKEN_REFRESHED') {
      agendarSync(500);
    }
    if (evento === 'SIGNED_OUT') emitir({ status: 'deslogado' });
  });
}
