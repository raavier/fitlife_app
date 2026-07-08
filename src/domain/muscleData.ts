import type { Musculo, Nivel } from './types.js';

export const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/**
 * Janela de recuperação por músculo, em HORAS, na forma {min, max}.
 * min = recuperação de uma sessão leve; max = de uma sessão pesada.
 * Baseado nas faixas: grandes 48-72h, intermediários ~36-60h, pequenos 24-36h.
 */
export const RECUPERACAO: Record<Musculo, { min: number; max: number }> = {
  // grandes
  peito: { min: 48, max: 72 },
  dorsal: { min: 48, max: 72 },
  quadriceps: { min: 48, max: 72 },
  posterior_coxa: { min: 48, max: 72 },
  gluteo: { min: 48, max: 72 },
  // intermediários
  trapezio: { min: 36, max: 60 },
  ombro_anterior: { min: 36, max: 60 },
  ombro_lateral: { min: 36, max: 60 },
  ombro_posterior: { min: 36, max: 60 },
  lombar: { min: 36, max: 60 },
  // pequenos / alta resistência
  biceps: { min: 24, max: 36 },
  triceps: { min: 24, max: 36 },
  antebraco: { min: 24, max: 36 },
  panturrilha: { min: 24, max: 36 },
  core: { min: 24, max: 36 },
  adutores: { min: 24, max: 36 },
  abdutores: { min: 24, max: 36 },
};

/**
 * Mapeamento de esportes -> músculos com peso de contribuição (0..1).
 * Alimenta o heatmap a partir de atividades extras. Editável pelo usuário.
 */
export const SPORT_MAP: Record<string, Partial<Record<Musculo, number>>> = {
  futebol: { quadriceps: 0.8, posterior_coxa: 0.6, panturrilha: 0.6, gluteo: 0.5, core: 0.3 },
  tenis: { ombro_anterior: 0.5, antebraco: 0.5, core: 0.4, quadriceps: 0.3, panturrilha: 0.3 },
  ciclismo: { quadriceps: 0.7, gluteo: 0.5, panturrilha: 0.4 },
  natacao: { dorsal: 0.6, ombro_posterior: 0.5, core: 0.4, peito: 0.3 },
  basquete: { quadriceps: 0.6, panturrilha: 0.6, gluteo: 0.4, ombro_lateral: 0.3 },
  volei: { quadriceps: 0.6, panturrilha: 0.6, ombro_lateral: 0.4, core: 0.3 },
};

/** Quantas "séries efetivas" 1h de esporte de peso 1.0 equivale, no heatmap. */
export const SERIES_POR_HORA_ESPORTE = 3;

/** Alvo de volume semanal (séries por grupo muscular) por nível. */
export function alvoVolume(nivel: Nivel): { min: number; max: number } {
  return nivel === 'iniciante' ? { min: 6, max: 10 } : { min: 10, max: 20 };
}
