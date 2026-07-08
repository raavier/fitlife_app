import Dexie, { type EntityTable, type Table } from 'dexie';
import type {
  ConfigItem,
  EsporteCustom,
  Ficha,
  LogTreino,
  PlanoCorrida,
  PlanoMensal,
  Tombstone,
} from './types';

/** Tabelas que participam da sincronização com o Supabase. */
export const TABELAS_SYNC = [
  'fichas',
  'logs',
  'planosMensais',
  'planosCorrida',
  'esportesCustom',
] as const;
export type TabelaSync = (typeof TABELAS_SYNC)[number];

// Flag: enquanto o motor de sync aplica mudanças vindas do servidor,
// os hooks NÃO devem carimbar updatedEm (senão o registro voltaria "sujo"
// e seria re-enviado num loop infinito).
let aplicandoRemoto = false;
export function comAplicacaoRemota<T>(fn: () => Promise<T>): Promise<T> {
  aplicandoRemoto = true;
  return fn().finally(() => {
    aplicandoRemoto = false;
  });
}

// Callback para o motor de sync agendar um push após escritas locais.
let aoMudarLocal: (() => void) | null = null;
export function registrarAoMudarLocal(cb: () => void): void {
  aoMudarLocal = cb;
}

class FitLifeDB extends Dexie {
  fichas!: EntityTable<Ficha, 'id'>;
  logs!: EntityTable<LogTreino, 'id'>;
  planosMensais!: EntityTable<PlanoMensal, 'id'>;
  planosCorrida!: EntityTable<PlanoCorrida, 'id'>;
  esportesCustom!: EntityTable<EsporteCustom, 'id'>;
  tombstones!: Table<Tombstone, [string, string]>;
  config!: EntityTable<ConfigItem, 'chave'>;

  constructor() {
    super('fitlife');
    this.version(1).stores({
      fichas: '++id, nome, modalidade, criadoEm',
      logs: '++id, timestamp, modalidade, planoDia',
      planosMensais: '++id, inicio, ativo, criadoEm',
      planosCorrida: '++id, ativo, criadoEm',
      esportesCustom: '++id, &tipo',
      config: '&chave',
    });
    // v2: campos de sincronização (uuid estável entre dispositivos + carimbo
    // de última modificação) e lápides para propagar exclusões.
    this.version(2)
      .stores({
        fichas: '++id, &uuid, nome, modalidade, criadoEm, updatedEm',
        logs: '++id, &uuid, timestamp, modalidade, planoDia, updatedEm',
        planosMensais: '++id, &uuid, inicio, ativo, criadoEm, updatedEm',
        planosCorrida: '++id, &uuid, ativo, criadoEm, updatedEm',
        esportesCustom: '++id, &uuid, &tipo, updatedEm',
        tombstones: '&[tabela+uuid], apagadoEm',
        config: '&chave',
      })
      .upgrade(async (tx) => {
        for (const tabela of TABELAS_SYNC) {
          await tx
            .table(tabela)
            .toCollection()
            .modify((r: { uuid?: string; updatedEm?: number }) => {
              r.uuid ??= crypto.randomUUID();
              r.updatedEm ??= Date.now();
            });
        }
      });

    for (const tabela of TABELAS_SYNC) {
      const t = this.table(tabela);
      t.hook('creating', (_pk, obj: { uuid?: string; updatedEm?: number }) => {
        obj.uuid ??= crypto.randomUUID();
        if (!aplicandoRemoto) {
          obj.updatedEm = Date.now();
          queueMicrotask(() => aoMudarLocal?.());
        } else {
          obj.updatedEm ??= Date.now();
        }
      });
      t.hook('updating', (mods) => {
        if (aplicandoRemoto) return undefined;
        queueMicrotask(() => aoMudarLocal?.());
        return { ...(mods as object), updatedEm: Date.now() };
      });
      t.hook('deleting', (_pk, obj: { uuid?: string }) => {
        if (aplicandoRemoto || !obj?.uuid) return;
        const uuid = obj.uuid;
        queueMicrotask(() => {
          void this.tombstones.put({ tabela, uuid, apagadoEm: Date.now() });
          aoMudarLocal?.();
        });
      });
    }
  }
}

export const db = new FitLifeDB();

export async function getConfig<T>(chave: string, padrao: T): Promise<T> {
  const item = await db.config.get(chave);
  return item ? (item.valor as T) : padrao;
}

export async function setConfig(chave: string, valor: unknown): Promise<void> {
  await db.config.put({ chave, valor });
}

export async function planoMensalAtivo(): Promise<PlanoMensal | undefined> {
  return db.planosMensais.where('ativo').equals(1).last();
}

export async function planoCorridaAtivo(): Promise<PlanoCorrida | undefined> {
  return db.planosCorrida.where('ativo').equals(1).last();
}
