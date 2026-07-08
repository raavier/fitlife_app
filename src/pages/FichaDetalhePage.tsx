// Detalhe/edição de ficha + ponto de partida para registrar a sessão.
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Secao } from '../components/ui';
import { db } from '../db/db';
import { exerciciosDaModalidade } from '../data/exercicios';
import { nomeEquipamento } from '../data/equipamentos';
import { COR_MODALIDADE, NOME_MODALIDADE, NOME_MUSCULO } from '../lib/labels';
import type { ExercicioFicha } from '../db/types';

export default function FichaDetalhePage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const ficha = useLiveQuery(() => db.fichas.get(Number(id)), [id]);
  const planoDia = params.get('plano');

  if (!ficha) return <p className="text-sm text-slate-400">Carregando…</p>;

  async function adicionarDoCatalogo() {
    if (!ficha) return;
    const catalogo = exerciciosDaModalidade(ficha.modalidade);
    const nomes = catalogo.map((e, i) => `${i + 1}. ${e.nome}`).join('\n');
    const escolha = window.prompt(`Número do exercício para adicionar:\n${nomes}`);
    const idx = Number(escolha) - 1;
    const ex = catalogo[idx];
    if (!ex) return;
    const novo: ExercicioFicha = {
      nome: ex.nome,
      equipamento: ex.equipamento,
      musculoPrimario: ex.musculoPrimario,
      musculosSecundarios: ex.musculosSecundarios,
      series: 3,
      reps: ficha.modalidade === 'calistenia' ? '6-12' : '8-12',
      descansoSeg: 90,
      progressaoAtual: ex.progressoes?.[0] ?? null,
      proximaProgressao: ex.progressoes?.[1] ?? null,
    };
    await db.fichas.update(ficha.id!, { exercicios: [...ficha.exercicios, novo] });
  }

  async function removerExercicio(i: number) {
    if (!ficha) return;
    const exercicios = ficha.exercicios.filter((_, j) => j !== i);
    await db.fichas.update(ficha.id!, { exercicios });
  }

  async function substituirExercicio(i: number) {
    if (!ficha) return;
    const catalogo = exerciciosDaModalidade(ficha.modalidade);
    const nomes = catalogo.map((e, k) => `${k + 1}. ${e.nome}`).join('\n');
    const escolha = window.prompt(`Substituir "${ficha.exercicios[i].nome}" por (número):\n${nomes}`);
    const idx = Number(escolha) - 1;
    const novo = catalogo[idx];
    if (!novo) return;
    const exercicios = [...ficha.exercicios];
    exercicios[i] = {
      ...exercicios[i],
      nome: novo.nome,
      equipamento: novo.equipamento,
      musculoPrimario: novo.musculoPrimario,
      musculosSecundarios: novo.musculosSecundarios,
      progressaoAtual: novo.progressoes?.[0] ?? exercicios[i].progressaoAtual,
      proximaProgressao: novo.progressoes?.[1] ?? exercicios[i].proximaProgressao,
    };
    await db.fichas.update(ficha.id!, { exercicios });
  }

  async function excluirFicha() {
    if (!ficha || !window.confirm(`Excluir a ficha "${ficha.nome}"?`)) return;
    await db.fichas.delete(ficha.id!);
    nav('/treinos');
  }

  return (
    <div>
      <header className="mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{ficha.nome}</h1>
          <span className={`chip ${COR_MODALIDADE[ficha.modalidade]}`}>{NOME_MODALIDADE[ficha.modalidade]}</span>
        </div>
        <p className="text-sm text-slate-400">
          {ficha.objetivo}
          {ficha.divisao ? ` · ${ficha.divisao}` : ''} · {ficha.exercicios.length} exercícios
          {ficha.origem === 'ia' ? ' · gerada por IA' : ''}
        </p>
      </header>

      <button
        className="btn-primary mb-4 w-full"
        onClick={() => nav(`/registrar/sessao/${ficha.id}${planoDia ? `?plano=${planoDia}` : ''}`)}
        disabled={ficha.exercicios.length === 0}
      >
        ▶ Iniciar sessão
      </button>

      <Secao
        titulo="Exercícios"
        acao={
          <button className="btn-ghost px-3 py-1 text-xs" onClick={adicionarDoCatalogo}>
            + Adicionar
          </button>
        }
      >
        {ficha.exercicios.length === 0 ? (
          <div className="card text-sm text-slate-400">Ficha vazia — adicione exercícios do catálogo.</div>
        ) : (
          <ul className="space-y-2">
            {ficha.exercicios.map((ex, i) => (
              <li key={i} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <strong>{ex.nome}</strong>
                    <p className="text-xs text-slate-400">
                      {nomeEquipamento(ex.equipamento)} · {NOME_MUSCULO[ex.musculoPrimario]}
                      {ex.musculosSecundarios.length > 0 &&
                        ` + ${ex.musculosSecundarios.map((s) => NOME_MUSCULO[s.musculo]).join(', ')}`}
                    </p>
                    <p className="text-xs text-slate-400">
                      {ex.series}× {ex.reps} · descanso {ex.descansoSeg}s
                    </p>
                    {ex.progressaoAtual && (
                      <p className="text-xs text-violet-300">
                        {ex.progressaoAtual} → {ex.proximaProgressao ?? 'topo da progressão'}
                      </p>
                    )}
                    {ex.observacao && <p className="text-xs italic text-slate-500">{ex.observacao}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button className="btn-ghost px-2 py-1 text-xs" onClick={() => substituirExercicio(i)}>
                      Trocar
                    </button>
                    <button className="btn-danger px-2 py-1 text-xs" onClick={() => removerExercicio(i)}>
                      Remover
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <button className="btn-danger w-full" onClick={excluirFicha}>
        Excluir ficha
      </button>
    </div>
  );
}
