// Biblioteca de fichas (academia + calistenia) + entrada dos geradores por IA.
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Secao } from '../components/ui';
import { db } from '../db/db';
import { COR_MODALIDADE, NOME_MODALIDADE } from '../lib/labels';

export default function TreinosPage() {
  const fichas = useLiveQuery(() => db.fichas.orderBy('criadoEm').reverse().toArray(), []);
  const [params] = useSearchParams();
  const nav = useNavigate();
  const planoDia = params.get('plano');

  async function criarFichaVazia() {
    const nome = window.prompt('Nome da ficha (ex.: Ficha A - Peito/Tríceps):');
    if (!nome) return;
    const id = await db.fichas.add({
      nome,
      modalidade: 'academia',
      objetivo: 'hipertrofia',
      exercicios: [],
      origem: 'manual',
      criadoEm: Date.now(),
    });
    nav(`/treinos/${id}`);
  }

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-xl font-bold">Treinos</h1>
        {planoDia && (
          <p className="text-sm text-emerald-400">Escolha a ficha para a sessão de hoje do plano.</p>
        )}
      </header>

      <Secao titulo="Gerar com IA">
        <div className="grid grid-cols-2 gap-2">
          <Link to="/treinos/gerar/academia" className="card block hover:border-sky-500/50">
            <span className="text-2xl">🏋️</span>
            <h3 className="mt-1 font-semibold">Ficha de academia</h3>
            <p className="text-xs text-slate-400">A partir dos aparelhos disponíveis</p>
          </Link>
          <Link to="/treinos/gerar/calistenia" className="card block hover:border-violet-500/50">
            <span className="text-2xl">🤸</span>
            <h3 className="mt-1 font-semibold">Treino de calistenia</h3>
            <p className="text-xs text-slate-400">Progressões por dificuldade</p>
          </Link>
        </div>
      </Secao>

      <Secao
        titulo="Minhas fichas"
        acao={
          <button className="btn-ghost px-3 py-1 text-xs" onClick={criarFichaVazia}>
            + Nova manual
          </button>
        }
      >
        {!fichas ? (
          <p className="text-sm text-slate-400">Carregando…</p>
        ) : fichas.length === 0 ? (
          <div className="card text-sm text-slate-400">
            Nenhuma ficha ainda. Gere uma com IA acima ou crie manualmente.
          </div>
        ) : (
          <div className="space-y-2">
            {fichas.map((f) => (
              <Link
                key={f.id}
                to={`/treinos/${f.id}${planoDia ? `?plano=${planoDia}` : ''}`}
                className="card flex items-center justify-between hover:border-slate-600"
              >
                <div>
                  <h3 className="font-semibold">{f.nome}</h3>
                  <p className="text-xs text-slate-400">
                    {f.exercicios.length} exercícios · {f.objetivo}
                    {f.divisao ? ` · ${f.divisao}` : ''}
                  </p>
                </div>
                <span className={`chip ${COR_MODALIDADE[f.modalidade]}`}>{NOME_MODALIDADE[f.modalidade]}</span>
              </Link>
            ))}
          </div>
        )}
      </Secao>
    </div>
  );
}
