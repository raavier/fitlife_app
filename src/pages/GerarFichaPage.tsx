// Gerador por IA — academia (spec 3b) e calistenia (spec 4).
// Fluxo: seleciona equipamentos → parâmetros → LLM → validação → revisão → salvar.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Aviso, Carregando, Secao } from '../components/ui';
import { EQUIPAMENTOS_ACADEMIA, EQUIPAMENTOS_CALISTENIA } from '../data/equipamentos';
import { db, getConfig, setConfig } from '../db/db';
import type { Ficha } from '../db/types';
import { gerarFichaAcademia, gerarTreinoCalistenia } from '../llm';
import { NOME_MUSCULO } from '../lib/labels';

export default function GerarFichaPage() {
  const { modalidade } = useParams<{ modalidade: 'academia' | 'calistenia' }>();
  const nav = useNavigate();
  const ehAcademia = modalidade === 'academia';
  const catalogo = ehAcademia ? EQUIPAMENTOS_ACADEMIA : EQUIPAMENTOS_CALISTENIA;

  const [equipamentos, setEquipamentos] = useState<string[]>([]);
  const [objetivo, setObjetivo] = useState(ehAcademia ? 'hipertrofia' : 'hipertrofia');
  const [divisao, setDivisao] = useState('full body');
  const [frequencia, setFrequencia] = useState(3);
  const [tempoMin, setTempoMin] = useState(60);
  const [nivel, setNivel] = useState('intermediario');
  const [restricoes, setRestricoes] = useState('');
  const [foco, setFoco] = useState('');
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');
  const [avisos, setAvisos] = useState<string[]>([]);
  const [preview, setPreview] = useState<Omit<Ficha, 'id'> | null>(null);

  // lembra a última seleção de equipamentos e o nível global
  useEffect(() => {
    getConfig<string[]>(`equipamentos_${modalidade}`, []).then((eq) => {
      if (eq.length) setEquipamentos(eq);
      else if (!ehAcademia) setEquipamentos(['peso_corporal']);
    });
    getConfig<string>('nivel', 'intermediario').then(setNivel);
  }, [modalidade, ehAcademia]);

  function alternar(id: string) {
    setEquipamentos((eq) => (eq.includes(id) ? eq.filter((x) => x !== id) : [...eq, id]));
  }

  async function gerar() {
    setErro('');
    setAvisos([]);
    setPreview(null);
    if (equipamentos.length === 0) {
      setErro('Selecione ao menos um equipamento (ou "peso corporal" na calistenia).');
      return;
    }
    setGerando(true);
    try {
      await setConfig(`equipamentos_${modalidade}`, equipamentos);
      const params = {
        objetivo,
        divisao,
        frequencia,
        tempoMin,
        nivel,
        restricoes,
        equipamentos,
        foco: foco || undefined,
      };
      const { ficha, avisos } = ehAcademia
        ? await gerarFichaAcademia(params)
        : await gerarTreinoCalistenia(params);
      setPreview(ficha);
      setAvisos(avisos);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setGerando(false);
    }
  }

  async function salvar() {
    if (!preview) return;
    const id = await db.fichas.add(preview);
    nav(`/treinos/${id}`);
  }

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-xl font-bold">
          {ehAcademia ? 'Gerar ficha de academia' : 'Gerar treino de calistenia'}
        </h1>
        <p className="text-sm text-slate-400">
          {ehAcademia
            ? 'Selecione os aparelhos da sua academia.'
            : 'Com pouca coisa dá pra montar treino completo — progressão por variação, não por carga.'}
        </p>
      </header>

      <Secao
        titulo="Equipamentos disponíveis"
        acao={
          ehAcademia ? (
            <button
              className="btn-ghost px-3 py-1 text-xs"
              onClick={() =>
                setEquipamentos(
                  equipamentos.length === catalogo.length ? [] : catalogo.map((e) => e.id),
                )
              }
            >
              {equipamentos.length === catalogo.length ? 'Limpar' : 'Tenho tudo'}
            </button>
          ) : undefined
        }
      >
        {[...new Set(catalogo.map((e) => e.grupo))].map((grupo) => (
          <div key={grupo} className="mb-2">
            <p className="mb-1 text-xs text-slate-500">{grupo}</p>
            <div className="flex flex-wrap gap-1.5">
              {catalogo
                .filter((e) => e.grupo === grupo)
                .map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => alternar(e.id)}
                    className={`chip ${
                      equipamentos.includes(e.id)
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                        : 'border-slate-700 text-slate-400'
                    }`}
                  >
                    {e.nome}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </Secao>

      <Secao titulo="Parâmetros">
        <div className="card grid grid-cols-2 gap-3">
          <label>
            <span className="label">Objetivo</span>
            <select className="input" value={objetivo} onChange={(e) => setObjetivo(e.target.value)}>
              <option value="forca">Força</option>
              <option value="hipertrofia">Hipertrofia</option>
              <option value="resistencia">Resistência</option>
              {ehAcademia ? <option value="condicionamento">Condicionamento</option> : <option value="skills">Skills</option>}
            </select>
          </label>
          <label>
            <span className="label">Divisão</span>
            <select className="input" value={divisao} onChange={(e) => setDivisao(e.target.value)}>
              <option value="full body">Full body</option>
              <option value="upper/lower">Upper / Lower</option>
              <option value="push/pull/legs">Push / Pull / Legs</option>
              <option value="ABC">ABC</option>
            </select>
          </label>
          <label>
            <span className="label">Frequência/semana</span>
            <input type="number" min={1} max={7} className="input" value={frequencia} onChange={(e) => setFrequencia(Number(e.target.value))} />
          </label>
          <label>
            <span className="label">Tempo por sessão (min)</span>
            <input type="number" min={15} max={180} step={5} className="input" value={tempoMin} onChange={(e) => setTempoMin(Number(e.target.value))} />
          </label>
          <label>
            <span className="label">Nível</span>
            <select className="input" value={nivel} onChange={(e) => setNivel(e.target.value)}>
              <option value="iniciante">Iniciante</option>
              <option value="intermediario">Intermediário</option>
              <option value="avancado">Avançado</option>
            </select>
          </label>
          <label>
            <span className="label">Foco do dia (opcional)</span>
            <input className="input" placeholder="ex.: empurrar" value={foco} onChange={(e) => setFoco(e.target.value)} />
          </label>
          <label className="col-span-2">
            <span className="label">Restrições / lesões</span>
            <input className="input" placeholder="ex.: dor no ombro direito" value={restricoes} onChange={(e) => setRestricoes(e.target.value)} />
          </label>
        </div>
      </Secao>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {gerando ? (
        <Carregando texto="Gerando com IA — validando JSON contra as regras…" />
      ) : (
        <button className="btn-primary w-full" onClick={gerar}>
          {preview ? 'Gerar de novo' : 'Gerar treino'}
        </button>
      )}

      {preview && (
        <Secao titulo="Revisão (edite depois de salvar se quiser)">
          {avisos.map((a, i) => (
            <Aviso key={i} tipo="aviso">
              {a}
            </Aviso>
          ))}
          <div className="card">
            <h3 className="mb-1 font-bold">{preview.nome}</h3>
            <p className="mb-3 text-xs text-slate-400">
              {preview.objetivo} · {preview.divisao} · ~{preview.duracaoEstimadaMin ?? '?'} min
            </p>
            <ul className="space-y-2">
              {preview.exercicios.map((ex, i) => (
                <li key={i} className="rounded-lg bg-slate-800/60 p-2 text-sm">
                  <div className="flex justify-between">
                    <strong>{ex.nome}</strong>
                    <span className="text-slate-400">
                      {ex.series}× {ex.reps}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {NOME_MUSCULO[ex.musculoPrimario]}
                    {ex.musculosSecundarios.length > 0 &&
                      ` (+ ${ex.musculosSecundarios.map((s) => NOME_MUSCULO[s.musculo]).join(', ')})`}
                    {' · '}descanso {ex.descansoSeg}s
                  </p>
                  {ex.progressaoAtual && (
                    <p className="text-xs text-violet-300">
                      Variação: {ex.progressaoAtual} → próx.: {ex.proximaProgressao ?? '—'}
                    </p>
                  )}
                  {ex.observacao && <p className="text-xs italic text-slate-500">{ex.observacao}</p>}
                </li>
              ))}
            </ul>
            <button className="btn-primary mt-3 w-full" onClick={salvar}>
              Salvar ficha
            </button>
          </div>
        </Secao>
      )}
    </div>
  );
}
