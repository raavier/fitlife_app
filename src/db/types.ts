// Tipos de persistência do app, construídos SOBRE os tipos do domínio.
// Nada aqui redefine o enum de músculos — sempre importar de ../domain.
import type { Modalidade, Musculo, Nivel, Objetivo, Secundario } from '../domain';

/** Modalidade ampliada do log (o domínio só conhece academia/calistenia). */
export type ModalidadeApp = 'academia' | 'calistenia' | 'corrida' | 'extra';

export type Qualidade = 'ruim' | 'medio' | 'bom';

export type TipoCorrida =
  | 'facil'
  | 'regenerativo'
  | 'longao'
  | 'tempo'
  | 'intervalado'
  | 'fartlek'
  | 'ladeira'
  | 'ritmo_prova'
  | 'strides';

/** Exercício dentro de uma ficha (academia ou calistenia). */
export interface ExercicioFicha {
  nome: string;
  equipamento: string; // id do catálogo de equipamentos
  musculoPrimario: Musculo;
  musculosSecundarios: Secundario[];
  series: number;
  reps: string; // "8-12" ou "30s"
  descansoSeg: number;
  progressaoAtual?: string | null; // calistenia
  proximaProgressao?: string | null; // calistenia
  observacao?: string;
}

export interface Ficha {
  id?: number;
  nome: string;
  modalidade: Modalidade;
  objetivo: Objetivo;
  divisao?: string;
  duracaoEstimadaMin?: number;
  exercicios: ExercicioFicha[];
  origem: 'manual' | 'ia';
  criadoEm: number;
}

export interface SerieExecutada {
  reps: number;
  carga?: number; // kg (academia)
}

export interface ExercicioExecutado extends ExercicioFicha {
  seriesFeitas: SerieExecutada[];
  substituiu?: string; // nome do exercício original, se houve substituição
}

export interface CorridaExecutada {
  tipo: TipoCorrida;
  distanciaKm: number;
  duracaoMin: number;
}

export interface AtividadeExtraExecutada {
  tipo: string; // chave do SPORT_MAP ou de esporte custom
  horas: number;
}

/** Log unificado de tudo que foi feito (alimenta heatmap, volume e relatório). */
export interface LogTreino {
  id?: number;
  timestamp: number;
  modalidade: ModalidadeApp;
  fichaId?: number;
  /** data ISO (YYYY-MM-DD) do dia do plano mensal que esta sessão cumpre */
  planoDia?: string;
  exercicios?: ExercicioExecutado[];
  corrida?: CorridaExecutada;
  extra?: AtividadeExtraExecutada;
  rpe: number; // 1-10
  qualidade?: Qualidade;
  observacao?: string;
  status: 'feito' | 'nao_feito';
  motivoNaoFeito?: string;
  /** flags de troca em relação ao plano */
  trocouModalidade?: boolean;
  moveuDe?: string; // data ISO original, se a sessão foi movida
}

export type ModalidadePlano = 'corrida' | 'academia' | 'calistenia' | 'descanso';

export interface DiaPlano {
  data: string; // YYYY-MM-DD
  modalidade: ModalidadePlano;
  foco: string | null;
}

export interface SemanaPlano {
  numero: number;
  deload: boolean;
  dias: DiaPlano[];
}

export interface PlanoMensal {
  id?: number;
  inicio: string;
  observacoes?: string;
  semanas: SemanaPlano[];
  freq: { corrida: number; academia: number; calistenia: number };
  diasDisponiveis: string[]; // ['seg','ter',...]
  ativo: 0 | 1;
  criadoEm: number;
}

export type FaseCorrida = 'base' | 'build' | 'pico' | 'taper';

export interface SessaoCorridaPlanejada {
  tipo: TipoCorrida;
  km: number;
  descricao: string;
}

export interface SemanaCorrida {
  numero: number;
  fase: FaseCorrida;
  kmTotal: number;
  deload: boolean;
  sessoes: SessaoCorridaPlanejada[];
}

export interface PlanoCorrida {
  id?: number;
  meta: string;
  dataAlvo?: string;
  nivel: Nivel;
  diasPorSemana: number;
  kmSemanaInicial: number;
  semanas: SemanaCorrida[];
  ativo: 0 | 1;
  criadoEm: number;
}

/** Esporte cadastrado pelo usuário fora do SPORT_MAP, com mapeamento manual. */
export interface EsporteCustom {
  id?: number;
  tipo: string;
  nome: string;
  musculos: Partial<Record<Musculo, number>>; // peso 0..1
}

export interface ConfigItem {
  chave: string;
  valor: unknown;
}

export type LlmProviderId = 'gemini' | 'groq' | 'openrouter';

export interface LlmConfig {
  provider: LlmProviderId;
  apiKey: string;
  model: string;
}
