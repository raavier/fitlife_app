// Planejador mensal: frequências desejadas + dias disponíveis → LLM → validação
// das regras de recuperação → calendário editável (spec seção 5, prompts seção 3).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Aviso, Carregando, Secao } from '../components/ui';
import { db, getConfig } from '../db/db';
import type { DiaPlano, ModalidadePlano, PlanoMensal } from '../db/types';
import { gerarPlanoMensalLlm } from '../llm';
import { contextoParaPlanoMensal } from '../lib/contextoIA';
import { COR_MODALIDADE, dataBR, DIAS_SEMANA, isoHoje, NOME_DIA, NOME_MODALIDADE } from '../lib/labels';
import { validarPlanoMensal } from '../lib/planoMensal';

export default function PlanoPage() {
  const plano = useLiveQuery(async () => (await db.planosMensais.where('ativo').equals(1).last()) ?? null, []);
  const logs = useLiveQuery(() => db.logs.filter((l) => !!l.planoDia).toArray(), []);
  const [montando, setMontando] = useState(false);

  if (plano === undefined) return <p className="text-sm text-slate-400">Carregando…</p>;

  return (
    <div>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Plano do mês</h1>
          <p className="text-sm text-slate-400">Corrida + academia + calistenia num calendário só.</p>
        </div>
        <Link to="/corrida" className="btn-ghost px-3 py-1.5 text-xs">
          🏃 Plano de corrida
        </Link>
      </header>

      {plano && !montando ? (
        <>
          <CalendarioPlano plano={plano} logs={logs ?? []} />
          <button className="btn-ghost mt-4 w-full" onClick={() => setMontando(true)}>
            Gerar novo plano (substitui o atual)
          </button>
        </>
      ) : (
        <FormNovoPlano
          onPronto={() => setMontando(false)}
          onCancelar={plano ? () => setMontando(false) : undefined}
        />
      )}
    </div>
  );
}

function FormNovoPlano({ onPronto, onCancelar }: { onPronto: () => void; onCancelar?: () => void }) {
  const [freqCorrida, setFreqCorrida] = useState(3);
  const [freqAcademia, setFreqAcademia] = useState(2);
  const [freqCalistenia, setFreqCalistenia] = useState(1);
  const [dias, setDias] = useState<string[]>(['seg', 'ter', 'qua', 'qui', 'sex', 'sab']);
  const [inicio, setInicio] = useState(isoHoje());
  const [metaCorrida, setMetaCorrida] = useState('');
  const [restricoes, setRestricoes] = useState('');
  const [preferencias, setPreferencias] = useState('');
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');
  const [errosValidacao, setErrosValidacao] = useState<string[]>([]);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [preview, setPreview] = useState<Pick<PlanoMensal, 'inicio' | 'observacoes' | 'semanas'> | null>(null);

  function alternarDia(d: string) {
    setDias((old) => (old.includes(d) ? old.filter((x) => x !== d) : [...old, d]));
  }

  async function gerar() {
    setErro('');
    setPreview(null);
    setErrosValidacao([]);
    setAvisos([]);
    if (dias.length < 2) {
      setErro('Selecione ao menos 2 dias disponíveis.');
      return;
    }
    setGerando(true);
    try {
      const nivel = await getConfig<string>('nivel', 'intermediario');
      const contexto = await contextoParaPlanoMensal();
      const p = await gerarPlanoMensalLlm({
        inicio,
        freq: { corrida: freqCorrida, academia: freqAcademia, calistenia: freqCalistenia },
        diasDisponiveis: dias,
        metaCorrida,
        nivel,
        restricoes,
        preferencias,
        contexto,
      });
      // Validação das regras de domínio (além do schema, já validado na camada LLM)
      const { erros, avisos } = validarPlanoMensal(p, dias);
      setPreview(p);
      setErrosValidacao(erros);
      setAvisos(avisos);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setGerando(false);
    }
  }

  async function salvar() {
    if (!preview) return;
    await db.planosMensais.where('ativo').equals(1).modify({ ativo: 0 });
    await db.planosMensais.add({
      ...preview,
      freq: { corrida: freqCorrida, academia: freqAcademia, calistenia: freqCalistenia },
      diasDisponiveis: dias,
      ativo: 1,
      criadoEm: Date.now(),
    });
    onPronto();
  }

  return (
    <div>
      <Secao titulo="Frequência semanal desejada">
        <div className="card grid grid-cols-3 gap-3">
          <label>
            <span className="label">🏃 Corridas</span>
            <input type="number" min={0} max={6} className="input" value={freqCorrida} onChange={(e) => setFreqCorrida(Number(e.target.value))} />
          </label>
          <label>
            <span className="label">🏋️ Academia</span>
            <input type="number" min={0} max={6} className="input" value={freqAcademia} onChange={(e) => setFreqAcademia(Number(e.target.value))} />
          </label>
          <label>
            <span className="label">🤸 Calistenia</span>
            <input type="number" min={0} max={6} className="input" value={freqCalistenia} onChange={(e) => setFreqCalistenia(Number(e.target.value))} />
          </label>
        </div>
      </Secao>

      <Secao titulo="Dias disponíveis">
        <div className="flex flex-wrap gap-1.5">
          {DIAS_SEMANA.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => alternarDia(d)}
              className={`chip ${dias.includes(d) ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200' : 'border-slate-700 text-slate-400'}`}
            >
              {NOME_DIA[d]}
            </button>
          ))}
        </div>
      </Secao>

      <Secao titulo="Detalhes">
        <div className="card space-y-3">
          <label>
            <span className="label">Começa em</span>
            <input type="date" className="input" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </label>
          <label>
            <span className="label">Meta de corrida (opcional)</span>
            <input className="input" placeholder='ex.: "10km em 8 semanas" ou vazio = manutenção' value={metaCorrida} onChange={(e) => setMetaCorrida(e.target.value)} />
          </label>
          <label>
            <span className="label">Restrições (opcional)</span>
            <input className="input" placeholder="ex.: joelho sensível" value={restricoes} onChange={(e) => setRestricoes(e.target.value)} />
          </label>
          <label>
            <span className="label">Preferências (opcional)</span>
            <input className="input" placeholder="ex.: longão no sábado" value={preferencias} onChange={(e) => setPreferencias(e.target.value)} />
          </label>
        </div>
      </Secao>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {gerando ? (
        <Carregando texto="Montando o mês com IA e validando as regras de recuperação…" />
      ) : (
        <div className="flex gap-2">
          {onCancelar && (
            <button className="btn-ghost" onClick={onCancelar}>
              Cancelar
            </button>
          )}
          <button className="btn-primary flex-1" onClick={gerar}>
            {preview ? 'Gerar de novo' : 'Montar plano do mês'}
          </button>
        </div>
      )}

      {preview && (
        <div className="mt-4">
          {errosValidacao.map((e, i) => (
            <Aviso key={i} tipo="erro">
              {e}
            </Aviso>
          ))}
          {avisos.map((a, i) => (
            <Aviso key={i} tipo="aviso">
              {a}
            </Aviso>
          ))}
          {preview.observacoes && <Aviso tipo="ok">{preview.observacoes}</Aviso>}
          <CalendarioPreview semanas={preview.semanas} />
          <button className="btn-primary mt-3 w-full" onClick={salvar} disabled={errosValidacao.length > 0}>
            {errosValidacao.length > 0 ? 'Corrija gerando de novo' : 'Ativar este plano'}
          </button>
        </div>
      )}
    </div>
  );
}

function CalendarioPreview({ semanas }: { semanas: PlanoMensal['semanas'] }) {
  return (
    <div className="space-y-3">
      {semanas.map((s) => (
        <div key={s.numero} className="card">
          <div className="mb-2 flex items-center justify-between">
            <strong className="text-sm">Semana {s.numero}</strong>
            {s.deload && <span className="chip border-cyan-500/40 bg-cyan-500/10 text-cyan-300">Deload</span>}
          </div>
          <div className="space-y-1">
            {s.dias.map((d) => (
              <div key={d.data} className="flex items-center gap-2 text-sm">
                <span className="w-14 shrink-0 text-xs text-slate-500">
                  {dataBR(d.data)} {NOME_DIA[diaCurto(d.data)]?.slice(0, 3)}
                </span>
                <span className={`chip ${COR_MODALIDADE[d.modalidade]}`}>{NOME_MODALIDADE[d.modalidade]}</span>
                <span className="truncate text-xs text-slate-400">{d.foco ?? ''}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function diaCurto(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return DIAS_SEMANA[new Date(y, m - 1, d).getDay()];
}

function CalendarioPlano({ plano, logs }: { plano: PlanoMensal; logs: { planoDia?: string; status: string }[] }) {
  const hoje = isoHoje();

  function statusDoDia(d: DiaPlano): 'feito' | 'nao_feito' | 'pendente' {
    const log = logs.find((l) => l.planoDia === d.data);
    if (log) return log.status === 'feito' ? 'feito' : 'nao_feito';
    return 'pendente';
  }

  async function editarDia(d: DiaPlano) {
    const opcoes = ['corrida', 'academia', 'calistenia', 'descanso'];
    const escolha = window.prompt(
      `${dataBR(d.data)} — trocar modalidade (atual: ${d.modalidade}).\nDigite: corrida, academia, calistenia ou descanso.\nOu "mover AAAA-MM-DD" para mover a sessão.`,
      d.modalidade,
    );
    if (!escolha) return;
    const semanas = plano.semanas.map((s) => ({ ...s, dias: s.dias.map((x) => ({ ...x })) }));
    const alvo = semanas.flatMap((s) => s.dias).find((x) => x.data === d.data);
    if (!alvo) return;

    const mover = escolha.match(/^mover\s+(\d{4}-\d{2}-\d{2})$/i);
    if (mover) {
      const destino = semanas.flatMap((s) => s.dias).find((x) => x.data === mover[1]);
      if (!destino) {
        window.alert('Data destino fora do plano.');
        return;
      }
      const tmp: DiaPlano = { ...destino };
      destino.modalidade = alvo.modalidade;
      destino.foco = alvo.foco;
      alvo.modalidade = tmp.modalidade === 'descanso' ? 'descanso' : tmp.modalidade;
      alvo.foco = tmp.foco;
    } else if (opcoes.includes(escolha.toLowerCase())) {
      alvo.modalidade = escolha.toLowerCase() as ModalidadePlano;
      if (alvo.modalidade === 'descanso') alvo.foco = null;
      else {
        const foco = window.prompt('Foco da sessão (ex.: fácil 5km, empurrar, pernas):', alvo.foco ?? '');
        alvo.foco = foco || alvo.foco;
      }
    } else {
      return;
    }
    await db.planosMensais.update(plano.id!, { semanas });
  }

  return (
    <div className="space-y-3">
      {plano.observacoes && <Aviso tipo="ok">{plano.observacoes}</Aviso>}
      {plano.semanas.map((s) => (
        <div key={s.numero} className="card">
          <div className="mb-2 flex items-center justify-between">
            <strong className="text-sm">Semana {s.numero}</strong>
            {s.deload && <span className="chip border-cyan-500/40 bg-cyan-500/10 text-cyan-300">Deload −25%</span>}
          </div>
          <div className="space-y-1">
            {s.dias.map((d) => {
              const st = statusDoDia(d);
              return (
                <button
                  key={d.data}
                  onClick={() => editarDia(d)}
                  className={`flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left text-sm hover:bg-slate-800/60 ${
                    d.data === hoje ? 'ring-1 ring-emerald-500/60' : ''
                  }`}
                >
                  <span className="w-14 shrink-0 text-xs text-slate-500">
                    {dataBR(d.data)} {NOME_DIA[diaCurto(d.data)]?.slice(0, 3)}
                  </span>
                  <span className={`chip ${COR_MODALIDADE[d.modalidade]}`}>{NOME_MODALIDADE[d.modalidade]}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-400">{d.foco ?? ''}</span>
                  <span className="text-xs">
                    {st === 'feito' ? '✅' : st === 'nao_feito' ? '❌' : d.data < hoje ? '·' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-center text-xs text-slate-500">Toque num dia para trocar modalidade, foco ou mover a sessão.</p>
    </div>
  );
}
