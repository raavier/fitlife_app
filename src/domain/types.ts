// Tipos centrais do domínio. Nenhuma dependência de UI ou storage — funções puras.

/** Enum canônico de músculos. É o MESMO usado nos prompts de LLM e no heatmap. */
export const MUSCULOS = [
  'peito', 'dorsal', 'trapezio',
  'ombro_anterior', 'ombro_lateral', 'ombro_posterior',
  'biceps', 'triceps', 'antebraco',
  'quadriceps', 'posterior_coxa', 'gluteo', 'panturrilha',
  'lombar', 'core', 'adutores', 'abdutores',
] as const;

export type Musculo = (typeof MUSCULOS)[number];

export function isMusculo(x: string): x is Musculo {
  return (MUSCULOS as readonly string[]).includes(x);
}

export type Objetivo = 'forca' | 'hipertrofia' | 'resistencia' | 'condicionamento' | 'skills';
export type Nivel = 'iniciante' | 'intermediario' | 'avancado';

/** Uma contribuição secundária de um exercício a um músculo, com peso 0..1. */
export interface Secundario {
  musculo: Musculo;
  peso: number; // ex.: supino -> triceps 0.5
}

/** Um exercício registrado em uma sessão. */
export interface ExercicioRegistrado {
  nome: string;
  musculoPrimario: Musculo;
  musculosSecundarios: Secundario[];
  series: number;
  rpe: number; // 1..10 (esforço percebido)
}

export type Modalidade = 'academia' | 'calistenia';

/** Uma sessão de musculação/calistenia realizada. */
export interface SessaoTreino {
  timestamp: number; // epoch ms de quando foi feita
  modalidade: Modalidade;
  exercicios: ExercicioRegistrado[];
}

/** Uma atividade extra (esporte avulso): futebol, tênis, etc. */
export interface AtividadeExtra {
  timestamp: number;
  tipo: string; // deve existir em SPORT_MAP para mapear músculos
  horas: number;
  rpe: number;
}

/**
 * Unidade interna de estímulo em UM músculo.
 * Tanto exercícios quanto atividades extras são convertidos nisto,
 * então volume e recuperação consomem a mesma representação.
 */
export interface Estimulo {
  musculo: Musculo;
  seriesEfetivas: number; // séries diretas + indiretas ponderadas (ou equivalente do esporte)
  rpe: number;
  timestamp: number;
}

export type StatusRecuperacao = 'pronto' | 'recuperando' | 'fadigado';
export type StatusVolume = 'abaixo' | 'dentro' | 'acima';
