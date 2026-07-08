// Relatório de fechamento do ciclo (spec seção 7): números calculados
// localmente + resumo narrativo gerado pela LLM a partir deles.
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Aviso, Carregando, Secao } from '../components/ui';
import { db } from '../db/db';
import { alvoVolume, statusVolume, type Musculo } from '../domain';
import { useEstimulos, useNivel } from '../hooks/useAppData';
import { NOME_MUSCULO, NOME_QUALIDADE } from '../lib/labels';
import { agregarRelatorio } from '../lib/relatorio';
import { gerarResumoRelatorio } from '../llm';
import type { RelatorioLlm } from '../llm/validate';

const DIA_MS = 24 * 3600 * 1000;

export default function RelatorioPage() {
  const plano = useLiveQuery(async () => (await db.planosMensais.where('ativo').equals(1).last()) ?? null, []);
  const logs = useLiveQuery(() => db.logs.toArray(), []);
  const estimulos = useEstimulos();
  const nivel = useNivel();
  const [resumo, setResumo] = useState<RelatorioLlm | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');

  // Período: o do plano ativo, ou os últimos 28 dias.
  const periodo = useMemo(() => {
    if (plano?.inicio) {
      const ini = new Date(plano.inicio).getTime();
      return { ini, fim: Math.min(Date.now(), ini + 28 * DIA_MS) };
    }
    return { ini: Date.now() - 28 * DIA_MS, fim: Date.now() };
  }, [plano]);

  const dados = useMemo(() => {
    if (!logs || !estimulos) return null;
    return agregarRelatorio(plano ?? undefined, logs, estimulos, periodo.ini, periodo.fim);
  }, [logs, estimulos, plano, periodo]);

  if (!dados) return <p className="text-sm text-slate-400">Carregando…</p>;

  const alvo = alvoVolume(nivel);
  const totalQ = dados.qualidade.bom + dados.qualidade.medio + dados.qualidade.ruim;

  async function gerarResumo() {
    if (!dados) return;
    setGerando(true);
    setErro('');
    try {
      const r = await gerarResumoRelatorio({
        periodo: `${dados.periodo.inicio} a ${dados.periodo.fim}`,
        adesao: dados.adesao,
        qualidade: dados.qualidade,
        volumeGrupo: dados.volumePorGrupo,
        corridaStats: dados.corrida,
        extras: dados.extras,
        obs: dados.observacoes.slice(0, 20).join(' | '),
      });
      setResumo(r);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setGerando(false);
    }
  }

  return (
    <div>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Relatório do ciclo</h1>
          <p className="text-sm text-slate-400">
            {dados.periodo.inicio} — {dados.periodo.fim}
          </p>
        </div>
        <button className="btn-ghost px-3 py-1.5 text-xs no-print" onClick={() => window.print()}>
          Exportar / imprimir
        </button>
      </header>

      <Secao titulo="Adesão (planejado × feito)">
        <div className="card grid grid-cols-3 gap-2 text-center">
          {(['corrida', 'academia', 'calistenia'] as const).map((m) => {
            const a = dados.adesao[m];
            const pct = a.planejado > 0 ? Math.round((a.feito / a.planejado) * 100) : null;
            return (
              <div key={m}>
                <p className="text-xs uppercase text-slate-500">{m}</p>
                <p className="text-2xl font-bold">{pct !== null ? `${pct}%` : '—'}</p>
                <p className="text-xs text-slate-400">
                  {a.feito}/{a.planejado > 0 ? a.planejado : '?'}
                </p>
              </div>
            );
          })}
        </div>
      </Secao>

      <Secao titulo="Qualidade das sessões">
        <div className="card">
          {totalQ === 0 ? (
            <p className="text-sm text-slate-400">Sem notas de qualidade no período.</p>
          ) : (
            <>
              <div className="mb-2 flex h-3 overflow-hidden rounded-full">
                <div className="bg-emerald-500" style={{ width: `${(dados.qualidade.bom / totalQ) * 100}%` }} />
                <div className="bg-amber-500" style={{ width: `${(dados.qualidade.medio / totalQ) * 100}%` }} />
                <div className="bg-rose-500" style={{ width: `${(dados.qualidade.ruim / totalQ) * 100}%` }} />
              </div>
              <p className="text-xs text-slate-400">
                {(['bom', 'medio', 'ruim'] as const).map((q) => `${NOME_QUALIDADE[q]}: ${dados.qualidade[q]}`).join(' · ')}
              </p>
            </>
          )}
        </div>
      </Secao>

      <Secao titulo={`Volume médio semanal × alvo (${alvo.min}–${alvo.max})`}>
        <div className="card space-y-1.5">
          {Object.entries(dados.volumePorGrupo)
            .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
            .map(([m, v]) => {
              const st = statusVolume(v ?? 0, nivel);
              return (
                <div key={m} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{NOME_MUSCULO[m as Musculo]}</span>
                  <span
                    className={st === 'acima' ? 'text-rose-400' : st === 'dentro' ? 'text-emerald-400' : 'text-slate-500'}
                  >
                    {(v ?? 0).toFixed(1)} séries/sem {st === 'acima' ? '▲' : st === 'abaixo' ? '▽' : '✓'}
                  </span>
                </div>
              );
            })}
          {Object.keys(dados.volumePorGrupo).length === 0 && (
            <p className="text-sm text-slate-400">Sem treinos de força no período.</p>
          )}
        </div>
      </Secao>

      <Secao titulo="Corrida">
        <div className="card text-sm text-slate-300">
          <p>Km por semana: {dados.corrida.kmPorSemana.join(' → ') || '—'}</p>
          <p>Pace médio: {dados.corrida.paceMedio}</p>
        </div>
      </Secao>

      {dados.extras.length > 0 && (
        <Secao titulo="Atividades extras">
          <div className="card text-sm text-slate-300">
            {dados.extras.map((e) => (
              <p key={e.tipo}>
                {e.tipo}: {e.horas}h
              </p>
            ))}
          </div>
        </Secao>
      )}

      <Secao titulo="Resumo e sugestões (IA)">
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {gerando ? (
          <Carregando texto="Analisando seus números…" />
        ) : resumo ? (
          <div className="card space-y-3 text-sm">
            <p className="text-slate-200">{resumo.resumo}</p>
            {resumo.pontos_fortes.length > 0 && (
              <div>
                <p className="mb-1 font-semibold text-emerald-400">Pontos fortes</p>
                <ul className="list-inside list-disc text-slate-300">
                  {resumo.pontos_fortes.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {resumo.pontos_atencao.length > 0 && (
              <div>
                <p className="mb-1 font-semibold text-amber-400">Pontos de atenção</p>
                <ul className="list-inside list-disc text-slate-300">
                  {resumo.pontos_atencao.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {resumo.sugestoes_proximo_ciclo.length > 0 && (
              <div>
                <p className="mb-1 font-semibold text-sky-400">Próximo ciclo</p>
                <ul className="list-inside list-disc text-slate-300">
                  {resumo.sugestoes_proximo_ciclo.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            <button className="btn-ghost w-full no-print" onClick={gerarResumo}>
              Gerar de novo
            </button>
          </div>
        ) : (
          <button className="btn-primary w-full no-print" onClick={gerarResumo}>
            Gerar resumo com IA
          </button>
        )}
      </Secao>
    </div>
  );
}
