// Ajustes: nível do usuário, fila de chaves de IA (com fallback) e esportes customizados.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Aviso, Secao } from '../components/ui';
import { db, getConfig, setConfig } from '../db/db';
import type { LlmKeyEntry, LlmProviderId } from '../db/types';
import { chamarLlm, MODELOS_PADRAO, NOME_PROVEDOR } from '../llm/client';
import { llmKeys, salvarLlmKeys } from '../llm';
import { NOME_MUSCULO } from '../lib/labels';
import type { Musculo, Nivel } from '../domain';

export default function AjustesPage() {
  const [nivel, setNivel] = useState<Nivel>('intermediario');
  const [salvo, setSalvo] = useState(false);
  const esportes = useLiveQuery(() => db.esportesCustom.toArray(), []);

  useEffect(() => {
    getConfig<Nivel>('nivel', 'intermediario').then(setNivel);
  }, []);

  async function salvarNivel(n: Nivel) {
    setNivel(n);
    await setConfig('nivel', n);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 1500);
  }

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-xl font-bold">Ajustes</h1>
      </header>

      <Secao titulo="Perfil">
        <div className="card">
          <label>
            <span className="label">Nível de treino (define o alvo de volume: 6-10 ou 10-20 séries)</span>
            <select className="input" value={nivel} onChange={(e) => salvarNivel(e.target.value as Nivel)}>
              <option value="iniciante">Iniciante</option>
              <option value="intermediario">Intermediário</option>
              <option value="avancado">Avançado</option>
            </select>
          </label>
          {salvo && <p className="mt-1 text-xs text-emerald-400">✓ salvo</p>}
        </div>
      </Secao>

      <SecaoChavesIA />

      <Secao titulo="Esportes cadastrados por você">
        <div className="card text-sm">
          {!esportes || esportes.length === 0 ? (
            <p className="text-slate-400">
              Nenhum. Cadastre ao registrar uma atividade extra fora da lista padrão.
            </p>
          ) : (
            <ul className="space-y-2">
              {esportes.map((e) => (
                <li key={e.id} className="flex items-start justify-between">
                  <div>
                    <strong>{e.nome}</strong>
                    <p className="text-xs text-slate-400">
                      {Object.entries(e.musculos)
                        .map(([m, p]) => `${NOME_MUSCULO[m as Musculo]} (${p})`)
                        .join(', ')}
                    </p>
                  </div>
                  <button
                    className="text-xs text-rose-400 underline"
                    onClick={() => window.confirm(`Excluir ${e.nome}?`) && db.esportesCustom.delete(e.id!)}
                  >
                    excluir
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Secao>

      <Secao titulo="Dados">
        <div className="card">
          <button
            className="btn-danger w-full"
            onClick={async () => {
              if (!window.confirm('Apagar TODOS os dados locais (fichas, logs, planos)? Não tem volta.')) return;
              await Promise.all([
                db.fichas.clear(),
                db.logs.clear(),
                db.planosMensais.clear(),
                db.planosCorrida.clear(),
                db.esportesCustom.clear(),
              ]);
            }}
          >
            Apagar todos os dados
          </button>
        </div>
      </Secao>
    </div>
  );
}

/** Fila de chaves de IA com fallback: adicionar, testar, reordenar, remover. */
function SecaoChavesIA() {
  const [chaves, setChaves] = useState<LlmKeyEntry[] | null>(null);
  const [novoProvider, setNovoProvider] = useState<LlmProviderId>('gemini');
  const [novaChave, setNovaChave] = useState('');
  const [novoModelo, setNovoModelo] = useState('');
  const [erro, setErro] = useState('');
  const [teste, setTeste] = useState<{ id: string; ok?: boolean; msg: string } | null>(null);

  useEffect(() => {
    llmKeys().then(setChaves);
  }, []);

  async function persistir(novas: LlmKeyEntry[]) {
    setChaves(novas);
    await salvarLlmKeys(novas);
  }

  async function adicionar() {
    setErro('');
    if (!novaChave.trim()) {
      setErro('Cole a chave da API antes de adicionar.');
      return;
    }
    const nova: LlmKeyEntry = {
      id: crypto.randomUUID(),
      provider: novoProvider,
      apiKey: novaChave.trim(),
      model: novoModelo.trim(),
    };
    await persistir([...(chaves ?? []), nova]);
    setNovaChave('');
    setNovoModelo('');
  }

  async function mover(i: number, delta: -1 | 1) {
    if (!chaves) return;
    const j = i + delta;
    if (j < 0 || j >= chaves.length) return;
    const novas = [...chaves];
    [novas[i], novas[j]] = [novas[j], novas[i]];
    await persistir(novas);
  }

  async function remover(id: string) {
    if (!chaves) return;
    await persistir(chaves.filter((c) => c.id !== id));
  }

  async function testar(c: LlmKeyEntry) {
    setTeste({ id: c.id, msg: 'Testando…' });
    try {
      const resposta = await chamarLlm(c, 'Responda APENAS com o JSON {"ok": true}.', [
        { role: 'user', content: 'teste' },
      ]);
      setTeste({ id: c.id, ok: resposta.includes('ok'), msg: 'Conexão OK — a IA respondeu.' });
    } catch (e) {
      setTeste({ id: c.id, ok: false, msg: e instanceof Error ? e.message : String(e) });
    }
  }

  function mascarar(chave: string): string {
    if (chave.length <= 8) return '••••';
    return `${chave.slice(0, 4)}…${chave.slice(-4)}`;
  }

  return (
    <Secao
      titulo="IA — fila de chaves (com fallback)"
      acao={
        <Link to="/ajustes/tutorial-chaves" className="btn-ghost px-3 py-1 text-xs">
          Como conseguir grátis?
        </Link>
      }
    >
      <div className="card space-y-3">
        <p className="text-xs text-slate-400">
          O app tenta as chaves <strong>na ordem abaixo</strong>. Se uma falhar (limite de tokens do
          dia, rate limit, chave inválida), passa automaticamente para a próxima. Cadastre mais de
          um provedor para nunca ficar na mão.
        </p>

        {chaves === null ? (
          <p className="text-sm text-slate-400">Carregando…</p>
        ) : chaves.length === 0 ? (
          <Aviso tipo="aviso">
            Nenhuma chave cadastrada — a geração por IA não vai funcionar.{' '}
            <Link to="/ajustes/tutorial-chaves" className="underline">
              Veja como criar as suas grátis
            </Link>
            .
          </Aviso>
        ) : (
          <ul className="space-y-2">
            {chaves.map((c, i) => (
              <li key={c.id} className="rounded-xl bg-slate-800/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-xs">
                        {i + 1}
                      </span>
                      {NOME_PROVEDOR[c.provider]}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {mascarar(c.apiKey)} · {c.model || `padrão: ${MODELOS_PADRAO[c.provider]}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button className="btn-ghost px-2 py-1 text-xs" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir prioridade">
                      ↑
                    </button>
                    <button className="btn-ghost px-2 py-1 text-xs" onClick={() => mover(i, 1)} disabled={i === chaves.length - 1} aria-label="Descer prioridade">
                      ↓
                    </button>
                    <button className="btn-ghost px-2 py-1 text-xs" onClick={() => testar(c)}>
                      Testar
                    </button>
                    <button className="btn-danger px-2 py-1 text-xs" onClick={() => remover(c.id)}>
                      ✕
                    </button>
                  </div>
                </div>
                {teste?.id === c.id && (
                  <p className={`mt-1.5 text-xs ${teste.ok === undefined ? 'text-slate-400' : teste.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {teste.msg}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-xl border border-slate-700 p-3">
          <p className="label">Adicionar chave</p>
          <div className="space-y-2">
            <select className="input" value={novoProvider} onChange={(e) => setNovoProvider(e.target.value as LlmProviderId)}>
              {(Object.keys(NOME_PROVEDOR) as LlmProviderId[]).map((p) => (
                <option key={p} value={p}>
                  {NOME_PROVEDOR[p]}
                </option>
              ))}
            </select>
            <input
              type="password"
              className="input"
              value={novaChave}
              onChange={(e) => setNovaChave(e.target.value)}
              placeholder="cole a API key aqui"
            />
            <input
              className="input"
              value={novoModelo}
              onChange={(e) => setNovoModelo(e.target.value)}
              placeholder={`modelo (vazio = ${MODELOS_PADRAO[novoProvider]})`}
            />
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            <button className="btn-primary w-full" onClick={adicionar}>
              + Adicionar à fila
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          As chaves ficam salvas apenas neste dispositivo (IndexedDB); as chamadas vão direto do
          navegador para o provedor.
        </p>
      </div>
    </Secao>
  );
}
