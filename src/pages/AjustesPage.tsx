// Ajustes: nível do usuário, provedor/chave da LLM e esportes customizados.
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Aviso, Secao } from '../components/ui';
import { db, getConfig, setConfig } from '../db/db';
import type { LlmConfig, LlmProviderId } from '../db/types';
import { chamarLlm, MODELOS_PADRAO, NOME_PROVEDOR } from '../llm/client';
import { NOME_MUSCULO } from '../lib/labels';
import type { Musculo, Nivel } from '../domain';

export default function AjustesPage() {
  const [nivel, setNivel] = useState<Nivel>('intermediario');
  const [llm, setLlm] = useState<LlmConfig>({ provider: 'gemini', apiKey: '', model: '' });
  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<{ ok: boolean; msg: string } | null>(null);
  const [salvo, setSalvo] = useState(false);
  const esportes = useLiveQuery(() => db.esportesCustom.toArray(), []);

  useEffect(() => {
    getConfig<Nivel>('nivel', 'intermediario').then(setNivel);
    getConfig<LlmConfig>('llm', { provider: 'gemini', apiKey: '', model: '' }).then(setLlm);
  }, []);

  async function salvar() {
    await setConfig('nivel', nivel);
    await setConfig('llm', llm);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  async function testarLlm() {
    setTestando(true);
    setResultadoTeste(null);
    try {
      await setConfig('llm', llm);
      const resposta = await chamarLlm(llm, 'Responda APENAS com o JSON {"ok": true}.', [
        { role: 'user', content: 'teste' },
      ]);
      setResultadoTeste({ ok: resposta.includes('ok'), msg: 'Conexão OK — a IA respondeu.' });
    } catch (e) {
      setResultadoTeste({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setTestando(false);
    }
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
            <select className="input" value={nivel} onChange={(e) => setNivel(e.target.value as Nivel)}>
              <option value="iniciante">Iniciante</option>
              <option value="intermediario">Intermediário</option>
              <option value="avancado">Avançado</option>
            </select>
          </label>
        </div>
      </Secao>

      <Secao titulo="IA (geração de fichas, plano e relatório)">
        <div className="card space-y-3">
          <label>
            <span className="label">Provedor (free tier)</span>
            <select
              className="input"
              value={llm.provider}
              onChange={(e) => setLlm({ ...llm, provider: e.target.value as LlmProviderId, model: '' })}
            >
              {(Object.keys(NOME_PROVEDOR) as LlmProviderId[]).map((p) => (
                <option key={p} value={p}>
                  {NOME_PROVEDOR[p]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Chave da API</span>
            <input
              type="password"
              className="input"
              value={llm.apiKey}
              onChange={(e) => setLlm({ ...llm, apiKey: e.target.value })}
              placeholder="cole sua API key"
            />
          </label>
          <label>
            <span className="label">Modelo (vazio = padrão: {MODELOS_PADRAO[llm.provider]})</span>
            <input
              className="input"
              value={llm.model}
              onChange={(e) => setLlm({ ...llm, model: e.target.value })}
              placeholder={MODELOS_PADRAO[llm.provider]}
            />
          </label>
          <p className="text-xs text-slate-500">
            A chave fica salva apenas neste dispositivo (IndexedDB). Free tiers: Gemini em
            aistudio.google.com, Groq em console.groq.com, OpenRouter em openrouter.ai.
          </p>
          {resultadoTeste && (
            <Aviso tipo={resultadoTeste.ok ? 'ok' : 'erro'}>{resultadoTeste.msg}</Aviso>
          )}
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={testarLlm} disabled={testando || !llm.apiKey}>
              {testando ? 'Testando…' : 'Testar conexão'}
            </button>
            <button className="btn-primary flex-1" onClick={salvar}>
              {salvo ? '✓ Salvo' : 'Salvar'}
            </button>
          </div>
        </div>
      </Secao>

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
