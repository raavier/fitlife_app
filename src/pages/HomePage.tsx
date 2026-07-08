// Tela inicial: painel de recuperação (heatmap) + sessão de hoje + ações rápidas.
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BodyMap from '../components/BodyMap';
import { Aviso, Secao } from '../components/ui';
import { alvoVolume, statusVolume, type Musculo } from '../domain';
import {
  useKmSemanais,
  useNivel,
  usePlanoMensal,
  useRecuperacao,
  useVolumeSemana,
} from '../hooks/useAppData';
import { avisoAumentoCarga } from '../lib/corrida';
import { COR_MODALIDADE, isoHoje, NOME_MODALIDADE, NOME_MUSCULO } from '../lib/labels';
import { diaDoPlano } from '../lib/planoMensal';
import { db } from '../db/db';

export default function HomePage() {
  const nav = useNavigate();
  const recuperacao = useRecuperacao();
  const volume = useVolumeSemana();
  const nivel = useNivel();
  const plano = usePlanoMensal();
  const kmSemanas = useKmSemanais(4);
  const [selecionado, setSelecionado] = useState<Musculo | null>(null);

  const hoje = isoHoje();
  const diaHoje = plano ? diaDoPlano(plano, hoje) : undefined;

  const alertas = useMemo(() => {
    const out: string[] = [];
    if (recuperacao) {
      for (const [m, r] of Object.entries(recuperacao)) {
        if (r && r.status === 'fadigado') {
          out.push(
            `${NOME_MUSCULO[m as Musculo]} ainda em recuperação (~${r.horasAteLiberar}h) — evite treino pesado desse grupo hoje.`,
          );
        }
      }
    }
    if (volume) {
      const alvo = alvoVolume(nivel);
      for (const [m, v] of Object.entries(volume)) {
        if (v !== undefined && statusVolume(v, nivel) === 'acima') {
          out.push(
            `${NOME_MUSCULO[m as Musculo]} com ${v} séries nesta semana — acima do alvo (${alvo.min}-${alvo.max}).`,
          );
        }
      }
    }
    const avisoKm = kmSemanas ? avisoAumentoCarga(kmSemanas.filter((k) => k > 0)) : null;
    if (avisoKm) out.push(avisoKm);
    return out;
  }, [recuperacao, volume, nivel, kmSemanas]);

  const detalhe = selecionado && recuperacao ? recuperacao[selecionado] : undefined;
  const alvo = alvoVolume(nivel);

  async function marcarNaoFeito() {
    if (!diaHoje) return;
    const motivo = window.prompt('Motivo (opcional):') ?? undefined;
    await db.logs.add({
      timestamp: Date.now(),
      modalidade: diaHoje.modalidade === 'descanso' ? 'extra' : diaHoje.modalidade,
      planoDia: hoje,
      rpe: 0,
      status: 'nao_feito',
      motivoNaoFeito: motivo,
    });
  }

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-xl font-bold">FitLife</h1>
        <p className="text-sm text-slate-400">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </header>

      <Secao titulo="Sessão de hoje">
        <div className="card">
          {plano === undefined ? (
            <p className="text-sm text-slate-400">Carregando…</p>
          ) : !plano ? (
            <div>
              <p className="mb-2 text-sm text-slate-300">Nenhum plano mensal ativo.</p>
              <Link to="/plano" className="btn-primary">
                Montar plano do mês
              </Link>
            </div>
          ) : diaHoje ? (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className={`chip ${COR_MODALIDADE[diaHoje.modalidade]}`}>
                  {NOME_MODALIDADE[diaHoje.modalidade]}
                </span>
                {diaHoje.foco && <span className="text-sm text-slate-300">{diaHoje.foco}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {diaHoje.modalidade === 'corrida' && (
                  <button className="btn-primary" onClick={() => nav('/registrar/corrida?plano=' + hoje)}>
                    Registrar corrida
                  </button>
                )}
                {(diaHoje.modalidade === 'academia' || diaHoje.modalidade === 'calistenia') && (
                  <button className="btn-primary" onClick={() => nav('/treinos?plano=' + hoje)}>
                    Iniciar treino
                  </button>
                )}
                {diaHoje.modalidade !== 'descanso' && (
                  <>
                    <Link to="/plano" className="btn-ghost">
                      Trocar
                    </Link>
                    <button className="btn-danger" onClick={marcarNaoFeito}>
                      Não fiz
                    </button>
                  </>
                )}
                {diaHoje.modalidade === 'descanso' && (
                  <p className="text-sm text-slate-400">Dia de descanso — aproveite a recuperação. 😌</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Hoje não está no plano ativo. Treino livre!</p>
          )}
          <div className="mt-3 flex gap-2 border-t border-slate-800 pt-3">
            <Link to="/registrar/extra" className="btn-ghost flex-1 text-xs">
              + Atividade extra
            </Link>
            <Link to="/registrar/corrida" className="btn-ghost flex-1 text-xs">
              + Corrida avulsa
            </Link>
            <Link to="/historico" className="btn-ghost flex-1 text-xs">
              Histórico
            </Link>
          </div>
        </div>
      </Secao>

      {alertas.length > 0 && (
        <Secao titulo="Alertas">
          {alertas.map((a, i) => (
            <Aviso key={i} tipo="aviso">
              {a}
            </Aviso>
          ))}
        </Secao>
      )}

      <Secao titulo="Recuperação muscular">
        <div className="card">
          {recuperacao ? (
            <>
              <BodyMap estados={recuperacao} selecionado={selecionado} onSelect={setSelecionado} />
              {detalhe && selecionado && (
                <div className="mt-3 rounded-xl bg-slate-800/70 p-3 text-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <strong>{NOME_MUSCULO[selecionado]}</strong>
                    <span
                      className={
                        detalhe.status === 'pronto'
                          ? 'text-emerald-400'
                          : detalhe.status === 'recuperando'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                      }
                    >
                      {detalhe.status === 'pronto'
                        ? 'Pronto'
                        : detalhe.status === 'recuperando'
                          ? 'Recuperando'
                          : 'Fadigado'}
                    </span>
                  </div>
                  <p className="text-slate-300">
                    Fadiga: {(detalhe.fadiga * 100).toFixed(0)}%
                    {detalhe.horasAteLiberar > 0 && <> · libera em ~{detalhe.horasAteLiberar}h</>}
                  </p>
                  <p className="text-slate-400">
                    Volume na semana: {(volume?.[selecionado] ?? 0).toFixed(1)} séries (alvo {alvo.min}–{alvo.max})
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400">Carregando…</p>
          )}
        </div>
      </Secao>

      <Secao titulo={`Volume da semana (alvo ${alvo.min}–${alvo.max} séries)`}>
        <div className="card space-y-2">
          {volume && Object.keys(volume).length > 0 ? (
            Object.entries(volume)
              .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
              .map(([m, v]) => {
                const st = statusVolume(v ?? 0, nivel);
                const pct = Math.min(100, ((v ?? 0) / alvo.max) * 100);
                return (
                  <div key={m}>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">{NOME_MUSCULO[m as Musculo]}</span>
                      <span
                        className={
                          st === 'acima' ? 'text-rose-400' : st === 'dentro' ? 'text-emerald-400' : 'text-slate-500'
                        }
                      >
                        {(v ?? 0).toFixed(1)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded bg-slate-800">
                      <div
                        className={`h-full ${st === 'acima' ? 'bg-rose-500' : st === 'dentro' ? 'bg-emerald-500' : 'bg-slate-600'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
          ) : (
            <p className="text-sm text-slate-400">Sem treinos registrados nesta semana ainda.</p>
          )}
        </div>
      </Secao>

      {kmSemanas && kmSemanas.some((k) => k > 0) && (
        <Secao titulo="Carga semanal de corrida (km)">
          <div className="card flex items-end gap-2">
            {kmSemanas.map((km, i) => {
              const max = Math.max(...kmSemanas, 1);
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs text-slate-300">{km}</span>
                  <div
                    className="w-full rounded-t bg-amber-500/70"
                    style={{ height: `${Math.max(4, (km / max) * 80)}px` }}
                  />
                  <span className="text-[10px] text-slate-500">{i === kmSemanas.length - 1 ? 'atual' : `S-${kmSemanas.length - 1 - i}`}</span>
                </div>
              );
            })}
          </div>
        </Secao>
      )}
    </div>
  );
}
