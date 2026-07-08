import type { Estimulo, Musculo, StatusRecuperacao } from './types.js';
import { RECUPERACAO, clamp01 } from './muscleData.js';

const HORA_MS = 3_600_000;

// Limiares de fadiga (0..1) para status/cor do heatmap.
export const LIMIAR_FADIGADO = 0.66; // vermelho
export const LIMIAR_RECUPERANDO = 0.33; // amarelo (abaixo disso = verde/pronto)

/**
 * Estresse relativo (0..1) de um estímulo: combina volume (séries efetivas)
 * e intensidade (RPE). ~8 séries efetivas satura a componente de volume.
 */
export function estresse(seriesEfetivas: number, rpe: number): number {
  const vol = clamp01(seriesEfetivas / 8);
  const intens = clamp01(rpe / 10);
  return clamp01(0.6 * vol + 0.4 * intens);
}

/** Horas de recuperação necessárias para este estímulo neste músculo. */
export function horasRecuperacao(musculo: Musculo, seriesEfetivas: number, rpe: number): number {
  const { min, max } = RECUPERACAO[musculo];
  const s = estresse(seriesEfetivas, rpe);
  return min + (max - min) * s;
}

/**
 * Fadiga acumulada (0..1) de um músculo em um instante `emTempo`,
 * somando o "resto" de cada estímulo recente (múltiplas sessões empilham).
 */
export function fadigaEm(musculo: Musculo, estimulos: Estimulo[], emTempo: number): number {
  let soma = 0;
  for (const e of estimulos) {
    if (e.musculo !== musculo) continue;
    if (e.timestamp > emTempo) continue; // ignora estímulos futuros
    const horasDesde = (emTempo - e.timestamp) / HORA_MS;
    const rec = horasRecuperacao(musculo, e.seriesEfetivas, e.rpe);
    const resto = clamp01(1 - horasDesde / rec);
    soma += resto;
  }
  return clamp01(soma);
}

export function statusDeFadiga(fadiga: number): StatusRecuperacao {
  if (fadiga >= LIMIAR_FADIGADO) return 'fadigado';
  if (fadiga >= LIMIAR_RECUPERANDO) return 'recuperando';
  return 'pronto';
}

export interface RecuperacaoMusculo {
  musculo: Musculo;
  fadiga: number; // 0..1
  status: StatusRecuperacao;
  horasAteLiberar: number; // horas até ficar 'pronto' (0 se já está)
}

/**
 * Estado de recuperação de um músculo em `agora`.
 * horasAteLiberar é estimada por simulação horária (cap 168h).
 */
export function recuperacaoDoMusculo(
  musculo: Musculo,
  estimulos: Estimulo[],
  agora: number,
): RecuperacaoMusculo {
  const fadiga = fadigaEm(musculo, estimulos, agora);
  const status = statusDeFadiga(fadiga);

  let horasAteLiberar = 0;
  if (fadiga >= LIMIAR_RECUPERANDO) {
    for (let h = 1; h <= 168; h++) {
      if (fadigaEm(musculo, estimulos, agora + h * HORA_MS) < LIMIAR_RECUPERANDO) {
        horasAteLiberar = h;
        break;
      }
      horasAteLiberar = h; // se nunca liberar em 168h, retorna o cap
    }
  }
  return { musculo, fadiga, status, horasAteLiberar };
}
