import type { Estimulo, Musculo, Nivel, StatusVolume } from './types.js';
import { alvoVolume } from './muscleData.js';

/**
 * Soma as séries efetivas por músculo dentro de uma janela [inicio, fim) (epoch ms).
 * Já inclui ativação indireta e atividades extras, pois tudo vira Estimulo.
 * Retorna um Record parcial (só músculos com volume > 0).
 */
export function volumeSemanalPorMusculo(
  estimulos: Estimulo[],
  inicio: number,
  fim: number,
): Partial<Record<Musculo, number>> {
  const out: Partial<Record<Musculo, number>> = {};
  for (const e of estimulos) {
    if (e.timestamp < inicio || e.timestamp >= fim) continue;
    out[e.musculo] = (out[e.musculo] ?? 0) + e.seriesEfetivas;
  }
  // arredonda a 1 casa para estabilidade
  for (const k of Object.keys(out) as Musculo[]) {
    out[k] = Math.round((out[k] as number) * 10) / 10;
  }
  return out;
}

/** Classifica o volume de um músculo contra o alvo do nível. */
export function statusVolume(series: number, nivel: Nivel): StatusVolume {
  const { min, max } = alvoVolume(nivel);
  if (series < min) return 'abaixo';
  if (series > max) return 'acima';
  return 'dentro';
}
