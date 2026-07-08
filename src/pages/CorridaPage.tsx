// Módulo corrida: meta → plano periodizado Base/Build/Pico/Taper gerado
// localmente pelas regras da spec (seção 2) — sem LLM aqui.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Aviso, Secao } from '../components/ui';
import { db } from '../db/db';
import { useKmSemanais } from '../hooks/useAppData';
import { avisoAumentoCarga, gerarPlanoCorrida, validarPlanoCorrida } from '../lib/corrida';
import { NOME_TIPO_CORRIDA } from '../lib/labels';
import type { Nivel } from '../domain';

const NOME_FASE: Record<string, string> = {
  base: 'Base',
  build: 'Build',
  pico: 'Pico',
  taper: 'Taper',
};
const COR_FASE: Record<string, string> = {
  base: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  build: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  pico: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  taper: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
};

export default function CorridaPage() {
  const plano = useLiveQuery(async () => (await db.planosCorrida.where('ativo').equals(1).last()) ?? null, []);
  const kmSemanas = useKmSemanais(4);
  const [editando, setEditando] = useState(false);

  const [meta, setMeta] = useState('correr 10 km');
  const [dataAlvo, setDataAlvo] = useState('');
  const [nivel, setNivel] = useState<Nivel>('intermediario');
  const [diasPorSemana, setDiasPorSemana] = useState(3);
  const [kmAtual, setKmAtual] = useState(0);
  const [erro, setErro] = useState('');

  if (plano === undefined) return <p className="text-sm text-slate-400">Carregando…</p>;

  const avisoCarga = kmSemanas ? avisoAumentoCarga(kmSemanas.filter((k) => k > 0)) : null;

  async function gerar() {
    setErro('');
    const novo = gerarPlanoCorrida({
      meta,
      dataAlvo: dataAlvo || undefined,
      nivel,
      diasPorSemana,
      kmSemanaAtual: kmAtual > 0 ? kmAtual : undefined,
    });
    const erros = validarPlanoCorrida(novo);
    if (erros.length > 0) {
      setErro(erros.join(' '));
      return;
    }
    await db.planosCorrida.where('ativo').equals(1).modify({ ativo: 0 });
    await db.planosCorrida.add(novo);
    setEditando(false);
  }

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-xl font-bold">Plano de corrida</h1>
        <p className="text-sm text-slate-400">Periodização: Base → Build → Pico{plano?.dataAlvo ? ' → Taper' : ''}.</p>
      </header>

      {avisoCarga && <Aviso tipo="aviso">{avisoCarga}</Aviso>}

      {plano && !editando ? (
        <>
          <div className="card mb-4">
            <strong>{plano.meta}</strong>
            <p className="text-xs text-slate-400">
              {plano.dataAlvo ? `Prova em ${plano.dataAlvo} · ` : 'Sem prova · '}
              {plano.diasPorSemana} treinos/semana · nível {plano.nivel}
            </p>
          </div>
          <Secao titulo="Semanas">
            <div className="space-y-2">
              {plano.semanas.map((s) => (
                <details key={s.numero} className="card">
                  <summary className="flex cursor-pointer list-none items-center justify-between">
                    <span className="text-sm font-semibold">Semana {s.numero}</span>
                    <span className="flex items-center gap-2">
                      {s.deload && <span className="chip border-cyan-500/40 bg-cyan-500/10 text-cyan-300">Deload</span>}
                      <span className={`chip ${COR_FASE[s.fase]}`}>{NOME_FASE[s.fase]}</span>
                      <span className="text-sm text-slate-300">{s.kmTotal} km</span>
                    </span>
                  </summary>
                  <ul className="mt-2 space-y-1 border-t border-slate-800 pt-2">
                    {s.sessoes.map((x, i) => (
                      <li key={i} className="flex justify-between text-sm">
                        <span className="text-slate-300">{NOME_TIPO_CORRIDA[x.tipo]}</span>
                        <span className="text-slate-400">{x.km} km</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-xs text-slate-500">{s.sessoes.map((x) => x.descricao).join(' · ')}</p>
                </details>
              ))}
            </div>
          </Secao>
          <button className="btn-ghost w-full" onClick={() => setEditando(true)}>
            Gerar novo plano
          </button>
        </>
      ) : (
        <div className="card space-y-3">
          <label>
            <span className="label">Meta</span>
            <input className="input" value={meta} onChange={(e) => setMeta(e.target.value)} placeholder='ex.: "5 km em 25 min", "primeira meia"' />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="label">Data da prova (opcional)</span>
              <input type="date" className="input" value={dataAlvo} onChange={(e) => setDataAlvo(e.target.value)} />
            </label>
            <label>
              <span className="label">Nível</span>
              <select className="input" value={nivel} onChange={(e) => setNivel(e.target.value as Nivel)}>
                <option value="iniciante">Iniciante</option>
                <option value="intermediario">Intermediário</option>
                <option value="avancado">Avançado</option>
              </select>
            </label>
            <label>
              <span className="label">Corridas por semana</span>
              <input type="number" min={2} max={6} className="input" value={diasPorSemana} onChange={(e) => setDiasPorSemana(Number(e.target.value))} />
            </label>
            <label>
              <span className="label">Km/semana atual (0 = não sei)</span>
              <input type="number" min={0} className="input" value={kmAtual} onChange={(e) => setKmAtual(Number(e.target.value))} />
            </label>
          </div>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <div className="flex gap-2">
            {plano && (
              <button className="btn-ghost" onClick={() => setEditando(false)}>
                Cancelar
              </button>
            )}
            <button className="btn-primary flex-1" onClick={gerar}>
              Gerar plano periodizado
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Regras aplicadas: aumento ≤10%/semana, deload a cada 4 semanas, 80/20 fácil/forte, base obrigatória
            {dataAlvo ? ', taper antes da prova' : ''}.
          </p>
        </div>
      )}
    </div>
  );
}
