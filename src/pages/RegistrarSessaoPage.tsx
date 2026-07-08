// Registro rápido da sessão de academia/calistenia: marcar séries, ajustar
// carga, timer de descanso e nota de qualidade em 1 toque (spec seção 6a/13).
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import RestTimer from '../components/RestTimer';
import { Aviso, QualityPicker, RpeSlider, Secao } from '../components/ui';
import { db } from '../db/db';
import type { ExercicioExecutado, Ficha, Qualidade } from '../db/types';

export default function RegistrarSessaoPage() {
  const { fichaId } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();

  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [exec, setExec] = useState<ExercicioExecutado[]>([]);
  const [exAtivo, setExAtivo] = useState(0);
  const [rpe, setRpe] = useState(7);
  const [qualidade, setQualidade] = useState<Qualidade | undefined>();
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    db.fichas.get(Number(fichaId)).then((f) => {
      if (!f) return;
      setFicha(f);
      setExec(f.exercicios.map((ex) => ({ ...ex, seriesFeitas: [] })));
    });
  }, [fichaId]);

  if (!ficha) return <p className="text-sm text-slate-400">Carregando…</p>;

  const atual = exec[exAtivo];

  function marcarSerie(reps: number, carga?: number) {
    setExec((old) =>
      old.map((e, i) => (i === exAtivo ? { ...e, seriesFeitas: [...e.seriesFeitas, { reps, carga }] } : e)),
    );
  }

  function desmarcarUltima() {
    setExec((old) =>
      old.map((e, i) => (i === exAtivo ? { ...e, seriesFeitas: e.seriesFeitas.slice(0, -1) } : e)),
    );
  }

  async function finalizar() {
    const feitos = exec.filter((e) => e.seriesFeitas.length > 0);
    if (feitos.length === 0) {
      setErro('Marque ao menos uma série antes de finalizar.');
      return;
    }
    if (!qualidade) {
      setErro('Dê a nota de qualidade da sessão (Ruim / Médio / Bom).');
      return;
    }
    await db.logs.add({
      timestamp: Date.now(),
      modalidade: ficha!.modalidade,
      fichaId: ficha!.id,
      planoDia: params.get('plano') ?? undefined,
      exercicios: feitos,
      rpe,
      qualidade,
      observacao: observacao || undefined,
      status: 'feito',
    });
    nav('/');
  }

  const repsSugerido = Number(String(atual?.reps ?? '10').match(/\d+/)?.[0] ?? 10);

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-xl font-bold">{ficha.nome}</h1>
        <p className="text-sm text-slate-400">Sessão em andamento — toque para marcar séries.</p>
      </header>

      <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
        {exec.map((e, i) => (
          <button
            key={i}
            onClick={() => setExAtivo(i)}
            className={`chip shrink-0 ${
              i === exAtivo
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                : e.seriesFeitas.length >= e.series
                  ? 'border-slate-600 bg-slate-800 text-slate-400 line-through'
                  : 'border-slate-700 text-slate-300'
            }`}
          >
            {e.nome} {e.seriesFeitas.length}/{e.series}
          </button>
        ))}
      </div>

      {atual && (
        <div className="card mb-4">
          <div className="mb-1 flex items-center justify-between">
            <strong>{atual.nome}</strong>
            <span className="text-sm text-slate-400">
              {atual.series}× {atual.reps}
            </span>
          </div>
          {atual.progressaoAtual && (
            <p className="mb-2 text-xs text-violet-300">
              Variação: {atual.progressaoAtual} → próxima: {atual.proximaProgressao ?? '—'}
            </p>
          )}
          {atual.observacao && <p className="mb-2 text-xs italic text-slate-500">{atual.observacao}</p>}

          <SerieForm
            modalidade={ficha.modalidade}
            repsSugerido={repsSugerido}
            onMarcar={marcarSerie}
          />

          {atual.seriesFeitas.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
              {atual.seriesFeitas.map((s, i) => (
                <span key={i} className="rounded bg-slate-800 px-2 py-1">
                  {s.reps} reps{s.carga ? ` · ${s.carga}kg` : ''}
                </span>
              ))}
              <button className="text-rose-400 underline" onClick={desmarcarUltima}>
                desfazer
              </button>
            </div>
          )}

          <div className="mt-3">
            <RestTimer segundosPadrao={atual.descansoSeg} />
          </div>
        </div>
      )}

      <Secao titulo="Fechar sessão">
        <div className="card space-y-3">
          <RpeSlider valor={rpe} onChange={setRpe} />
          <div>
            <span className="label">Qualidade da sessão</span>
            <QualityPicker valor={qualidade} onChange={setQualidade} />
          </div>
          <label>
            <span className="label">Como me senti (opcional)</span>
            <input
              className="input"
              placeholder="ex.: faltou energia no fim"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </label>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <button className="btn-primary w-full" onClick={finalizar}>
            Finalizar e salvar
          </button>
        </div>
      </Secao>
    </div>
  );
}

function SerieForm({
  modalidade,
  repsSugerido,
  onMarcar,
}: {
  modalidade: 'academia' | 'calistenia';
  repsSugerido: number;
  onMarcar: (reps: number, carga?: number) => void;
}) {
  const [reps, setReps] = useState(repsSugerido);
  const [carga, setCarga] = useState<number | ''>('');

  useEffect(() => setReps(repsSugerido), [repsSugerido]);

  return (
    <div className="flex items-end gap-2">
      <label className="w-20">
        <span className="label">Reps</span>
        <input type="number" className="input" min={1} value={reps} onChange={(e) => setReps(Number(e.target.value))} />
      </label>
      {modalidade === 'academia' && (
        <label className="w-24">
          <span className="label">Carga (kg)</span>
          <input
            type="number"
            className="input"
            min={0}
            step={0.5}
            value={carga}
            onChange={(e) => setCarga(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </label>
      )}
      <button
        className="btn-primary flex-1"
        onClick={() => onMarcar(reps, carga === '' ? undefined : carga)}
      >
        ✓ Série feita
      </button>
    </div>
  );
}
