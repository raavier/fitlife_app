// Histórico de tudo que foi registrado.
import { Secao } from '../components/ui';
import { useLogs } from '../hooks/useAppData';
import { COR_MODALIDADE, dataHoraBR, NOME_MODALIDADE, NOME_QUALIDADE, NOME_TIPO_CORRIDA, pace } from '../lib/labels';
import { db } from '../db/db';

export default function HistoricoPage() {
  const logs = useLogs();

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-xl font-bold">Histórico</h1>
      </header>
      <Secao titulo={`${logs?.length ?? 0} registros`}>
        {!logs ? (
          <p className="text-sm text-slate-400">Carregando…</p>
        ) : logs.length === 0 ? (
          <div className="card text-sm text-slate-400">Nada registrado ainda.</div>
        ) : (
          <div className="space-y-2">
            {logs.map((l) => (
              <div key={l.id} className="card">
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className={`chip ${COR_MODALIDADE[l.modalidade]}`}>{NOME_MODALIDADE[l.modalidade]}</span>
                    {l.status === 'nao_feito' && <span className="chip border-rose-500/40 text-rose-300">não feito</span>}
                  </span>
                  <span className="text-xs text-slate-500">{dataHoraBR(l.timestamp)}</span>
                </div>
                <p className="text-sm text-slate-300">
                  {l.corrida &&
                    `${NOME_TIPO_CORRIDA[l.corrida.tipo]} · ${l.corrida.distanciaKm} km em ${l.corrida.duracaoMin} min (${pace(l.corrida.distanciaKm, l.corrida.duracaoMin)})`}
                  {l.exercicios &&
                    `${l.exercicios.length} exercícios · ${l.exercicios.reduce((s, e) => s + e.seriesFeitas.length, 0)} séries`}
                  {l.extra && `${l.extra.tipo} · ${l.extra.horas}h`}
                  {l.status === 'nao_feito' && (l.motivoNaoFeito || 'sem motivo informado')}
                </p>
                <p className="text-xs text-slate-500">
                  {l.status === 'feito' && `RPE ${l.rpe}/10`}
                  {l.qualidade && ` · ${NOME_QUALIDADE[l.qualidade]}`}
                  {l.observacao && ` · “${l.observacao}”`}
                </p>
                <button
                  className="mt-1 text-xs text-rose-400 underline"
                  onClick={() => window.confirm('Excluir este registro?') && db.logs.delete(l.id!)}
                >
                  excluir
                </button>
              </div>
            ))}
          </div>
        )}
      </Secao>
    </div>
  );
}
