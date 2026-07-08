import type {
  ExercicioRegistrado, SessaoTreino, AtividadeExtra, Estimulo, Musculo,
} from './types.js';
import { SPORT_MAP, SERIES_POR_HORA_ESPORTE } from './muscleData.js';

/**
 * Converte um exercício em estímulos por músculo.
 * Primário recebe 100% das séries; secundários recebem series * peso (ativação indireta).
 */
export function exercicioParaEstimulos(ex: ExercicioRegistrado, timestamp: number): Estimulo[] {
  const out: Estimulo[] = [
    { musculo: ex.musculoPrimario, seriesEfetivas: ex.series, rpe: ex.rpe, timestamp },
  ];
  for (const sec of ex.musculosSecundarios) {
    out.push({
      musculo: sec.musculo,
      seriesEfetivas: ex.series * sec.peso,
      rpe: ex.rpe,
      timestamp,
    });
  }
  return out;
}

export function sessaoParaEstimulos(sessao: SessaoTreino): Estimulo[] {
  return sessao.exercicios.flatMap((ex) => exercicioParaEstimulos(ex, sessao.timestamp));
}

/**
 * Converte uma atividade extra (esporte) em estímulos.
 * seriesEfetivas = peso * horas * SERIES_POR_HORA_ESPORTE.
 * Esportes fora do SPORT_MAP retornam vazio (o app pede mapeamento manual).
 */
export function atividadeParaEstimulos(a: AtividadeExtra): Estimulo[] {
  const mapa = SPORT_MAP[a.tipo];
  if (!mapa) return [];
  const out: Estimulo[] = [];
  for (const [musculo, peso] of Object.entries(mapa)) {
    out.push({
      musculo: musculo as Musculo,
      seriesEfetivas: (peso as number) * a.horas * SERIES_POR_HORA_ESPORTE,
      rpe: a.rpe,
      timestamp: a.timestamp,
    });
  }
  return out;
}

/**
 * Agrega estímulos que compartilham (músculo, timestamp) num único estímulo:
 * soma as séries efetivas e usa o maior RPE. Evita contar duas vezes o timing
 * quando um músculo é atingido como primário e secundário na mesma sessão.
 */
export function agregarEstimulos(estimulos: Estimulo[]): Estimulo[] {
  const mapa = new Map<string, Estimulo>();
  for (const e of estimulos) {
    const chave = `${e.musculo}|${e.timestamp}`;
    const atual = mapa.get(chave);
    if (atual) {
      atual.seriesEfetivas += e.seriesEfetivas;
      atual.rpe = Math.max(atual.rpe, e.rpe);
    } else {
      mapa.set(chave, { ...e });
    }
  }
  return [...mapa.values()];
}
