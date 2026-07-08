// Catálogo semente de exercícios com mapeamento muscular (spec 8.3) e
// progressões de calistenia (spec seção 4). Usado para montar fichas manuais
// e para substituir exercícios. Pesos de ativação indireta seguem a spec.
import type { Musculo, Secundario } from '../domain';

export interface ExercicioCatalogo {
  nome: string;
  modalidade: 'academia' | 'calistenia';
  equipamento: string; // id do catálogo de equipamentos
  musculoPrimario: Musculo;
  musculosSecundarios: Secundario[];
  progressoes?: string[]; // calistenia: da mais fácil para a mais difícil
}

export const EXERCICIOS: ExercicioCatalogo[] = [
  // ===== ACADEMIA =====
  { nome: 'Supino reto', modalidade: 'academia', equipamento: 'supino_reto_livre', musculoPrimario: 'peito', musculosSecundarios: [{ musculo: 'triceps', peso: 0.5 }, { musculo: 'ombro_anterior', peso: 0.4 }] },
  { nome: 'Supino reto máquina', modalidade: 'academia', equipamento: 'supino_maquina', musculoPrimario: 'peito', musculosSecundarios: [{ musculo: 'triceps', peso: 0.5 }, { musculo: 'ombro_anterior', peso: 0.4 }] },
  { nome: 'Supino inclinado', modalidade: 'academia', equipamento: 'supino_inclinado', musculoPrimario: 'peito', musculosSecundarios: [{ musculo: 'ombro_anterior', peso: 0.5 }, { musculo: 'triceps', peso: 0.4 }] },
  { nome: 'Crucifixo no voador', modalidade: 'academia', equipamento: 'peck_deck', musculoPrimario: 'peito', musculosSecundarios: [{ musculo: 'ombro_anterior', peso: 0.2 }] },
  { nome: 'Crossover', modalidade: 'academia', equipamento: 'crossover', musculoPrimario: 'peito', musculosSecundarios: [{ musculo: 'ombro_anterior', peso: 0.2 }] },
  { nome: 'Puxada frente', modalidade: 'academia', equipamento: 'puxada_frente', musculoPrimario: 'dorsal', musculosSecundarios: [{ musculo: 'biceps', peso: 0.5 }, { musculo: 'ombro_posterior', peso: 0.3 }] },
  { nome: 'Remada baixa', modalidade: 'academia', equipamento: 'remada_baixa', musculoPrimario: 'dorsal', musculosSecundarios: [{ musculo: 'biceps', peso: 0.5 }, { musculo: 'ombro_posterior', peso: 0.3 }] },
  { nome: 'Remada curvada', modalidade: 'academia', equipamento: 'remada_curvada', musculoPrimario: 'dorsal', musculosSecundarios: [{ musculo: 'biceps', peso: 0.5 }, { musculo: 'lombar', peso: 0.4 }] },
  { nome: 'Barra fixa', modalidade: 'academia', equipamento: 'barra_fixa_academia', musculoPrimario: 'dorsal', musculosSecundarios: [{ musculo: 'biceps', peso: 0.6 }, { musculo: 'core', peso: 0.3 }] },
  { nome: 'Desenvolvimento', modalidade: 'academia', equipamento: 'desenvolvimento', musculoPrimario: 'ombro_anterior', musculosSecundarios: [{ musculo: 'ombro_lateral', peso: 0.5 }, { musculo: 'triceps', peso: 0.5 }] },
  { nome: 'Elevação lateral', modalidade: 'academia', equipamento: 'elevacao_lateral', musculoPrimario: 'ombro_lateral', musculosSecundarios: [] },
  { nome: 'Crucifixo invertido', modalidade: 'academia', equipamento: 'crucifixo_invertido', musculoPrimario: 'ombro_posterior', musculosSecundarios: [{ musculo: 'trapezio', peso: 0.3 }] },
  { nome: 'Encolhimento', modalidade: 'academia', equipamento: 'encolhimento', musculoPrimario: 'trapezio', musculosSecundarios: [{ musculo: 'antebraco', peso: 0.2 }] },
  { nome: 'Rosca direta', modalidade: 'academia', equipamento: 'rosca_direta', musculoPrimario: 'biceps', musculosSecundarios: [{ musculo: 'antebraco', peso: 0.3 }] },
  { nome: 'Rosca martelo', modalidade: 'academia', equipamento: 'rosca_martelo', musculoPrimario: 'biceps', musculosSecundarios: [{ musculo: 'antebraco', peso: 0.4 }] },
  { nome: 'Tríceps pulley', modalidade: 'academia', equipamento: 'triceps_pulley', musculoPrimario: 'triceps', musculosSecundarios: [] },
  { nome: 'Tríceps testa', modalidade: 'academia', equipamento: 'triceps_testa', musculoPrimario: 'triceps', musculosSecundarios: [] },
  { nome: 'Agachamento no Smith', modalidade: 'academia', equipamento: 'smith', musculoPrimario: 'quadriceps', musculosSecundarios: [{ musculo: 'gluteo', peso: 0.7 }, { musculo: 'posterior_coxa', peso: 0.4 }, { musculo: 'lombar', peso: 0.3 }] },
  { nome: 'Leg press 45°', modalidade: 'academia', equipamento: 'leg_press_45', musculoPrimario: 'quadriceps', musculosSecundarios: [{ musculo: 'gluteo', peso: 0.7 }, { musculo: 'posterior_coxa', peso: 0.4 }] },
  { nome: 'Cadeira extensora', modalidade: 'academia', equipamento: 'cadeira_extensora', musculoPrimario: 'quadriceps', musculosSecundarios: [] },
  { nome: 'Mesa flexora', modalidade: 'academia', equipamento: 'mesa_flexora', musculoPrimario: 'posterior_coxa', musculosSecundarios: [] },
  { nome: 'Levantamento terra', modalidade: 'academia', equipamento: 'barras_anilhas', musculoPrimario: 'posterior_coxa', musculosSecundarios: [{ musculo: 'gluteo', peso: 0.8 }, { musculo: 'lombar', peso: 0.8 }, { musculo: 'trapezio', peso: 0.4 }] },
  { nome: 'Hip thrust', modalidade: 'academia', equipamento: 'hip_thrust', musculoPrimario: 'gluteo', musculosSecundarios: [{ musculo: 'posterior_coxa', peso: 0.4 }] },
  { nome: 'Cadeira abdutora', modalidade: 'academia', equipamento: 'cadeira_abdutora', musculoPrimario: 'abdutores', musculosSecundarios: [{ musculo: 'gluteo', peso: 0.4 }] },
  { nome: 'Cadeira adutora', modalidade: 'academia', equipamento: 'cadeira_adutora', musculoPrimario: 'adutores', musculosSecundarios: [] },
  { nome: 'Panturrilha em pé', modalidade: 'academia', equipamento: 'panturrilha_em_pe', musculoPrimario: 'panturrilha', musculosSecundarios: [] },
  { nome: 'Abdominal máquina', modalidade: 'academia', equipamento: 'abdominal_maquina', musculoPrimario: 'core', musculosSecundarios: [] },
  { nome: 'Cadeira romana (extensão lombar)', modalidade: 'academia', equipamento: 'cadeira_romana', musculoPrimario: 'lombar', musculosSecundarios: [{ musculo: 'gluteo', peso: 0.4 }, { musculo: 'posterior_coxa', peso: 0.3 }] },

  // ===== CALISTENIA =====
  { nome: 'Flexão', modalidade: 'calistenia', equipamento: 'peso_corporal', musculoPrimario: 'peito', musculosSecundarios: [{ musculo: 'triceps', peso: 0.6 }, { musculo: 'ombro_anterior', peso: 0.4 }], progressoes: ['Flexão inclinada', 'Flexão normal', 'Flexão declinada', 'Flexão diamante', 'Flexão arqueira', 'Flexão um braço'] },
  { nome: 'Barra (pull-up)', modalidade: 'calistenia', equipamento: 'barra_fixa', musculoPrimario: 'dorsal', musculosSecundarios: [{ musculo: 'biceps', peso: 0.6 }, { musculo: 'core', peso: 0.3 }], progressoes: ['Remada australiana', 'Negativa', 'Barra completa', 'Barra arqueira', 'Barra um braço'] },
  { nome: 'Dips (paralelas)', modalidade: 'calistenia', equipamento: 'paralelas', musculoPrimario: 'triceps', musculosSecundarios: [{ musculo: 'peito', peso: 0.6 }, { musculo: 'ombro_anterior', peso: 0.4 }], progressoes: ['Dips no banco', 'Dips nas paralelas', 'Dips com pausa', 'Dips com lastro / argolas'] },
  { nome: 'Agachamento', modalidade: 'calistenia', equipamento: 'peso_corporal', musculoPrimario: 'quadriceps', musculosSecundarios: [{ musculo: 'gluteo', peso: 0.7 }, { musculo: 'posterior_coxa', peso: 0.4 }], progressoes: ['Agachamento livre', 'Afundo', 'Búlgaro', 'Pistol assistido', 'Pistol'] },
  { nome: 'Prancha', modalidade: 'calistenia', equipamento: 'tapete', musculoPrimario: 'core', musculosSecundarios: [], progressoes: ['Prancha', 'Hollow hold', 'L-sit', 'Dragon flag'] },
  { nome: 'Remada australiana', modalidade: 'calistenia', equipamento: 'barra_fixa', musculoPrimario: 'dorsal', musculosSecundarios: [{ musculo: 'biceps', peso: 0.5 }, { musculo: 'ombro_posterior', peso: 0.3 }], progressoes: ['Remada inclinada', 'Remada australiana', 'Remada australiana pés elevados', 'Remada arqueira'] },
  { nome: 'Ponte de glúteo', modalidade: 'calistenia', equipamento: 'tapete', musculoPrimario: 'gluteo', musculosSecundarios: [{ musculo: 'posterior_coxa', peso: 0.5 }, { musculo: 'lombar', peso: 0.3 }], progressoes: ['Ponte com 2 pernas', 'Ponte unilateral', 'Ponte com pés elevados'] },
  { nome: 'Panturrilha unilateral', modalidade: 'calistenia', equipamento: 'banco', musculoPrimario: 'panturrilha', musculosSecundarios: [], progressoes: ['Bilateral no chão', 'Unilateral no degrau', 'Unilateral com pausa'] },
  { nome: 'Burpee', modalidade: 'calistenia', equipamento: 'peso_corporal', musculoPrimario: 'quadriceps', musculosSecundarios: [{ musculo: 'peito', peso: 0.4 }, { musculo: 'core', peso: 0.4 }, { musculo: 'panturrilha', peso: 0.3 }] },
  { nome: 'Mountain climber', modalidade: 'calistenia', equipamento: 'peso_corporal', musculoPrimario: 'core', musculosSecundarios: [{ musculo: 'quadriceps', peso: 0.4 }, { musculo: 'ombro_anterior', peso: 0.3 }] },
  { nome: 'Muscle-up (skill)', modalidade: 'calistenia', equipamento: 'barra_fixa', musculoPrimario: 'dorsal', musculosSecundarios: [{ musculo: 'triceps', peso: 0.5 }, { musculo: 'peito', peso: 0.4 }, { musculo: 'core', peso: 0.3 }], progressoes: ['Barra explosiva peito na barra', 'Muscle-up com elástico', 'Muscle-up'] },
  { nome: 'Front lever (skill)', modalidade: 'calistenia', equipamento: 'barra_fixa', musculoPrimario: 'dorsal', musculosSecundarios: [{ musculo: 'core', peso: 0.7 }, { musculo: 'ombro_posterior', peso: 0.4 }], progressoes: ['Tuck front lever', 'Advanced tuck', 'One leg', 'Straddle', 'Front lever completo'] },
  { nome: 'Planche (skill)', modalidade: 'calistenia', equipamento: 'paralelas', musculoPrimario: 'ombro_anterior', musculosSecundarios: [{ musculo: 'peito', peso: 0.5 }, { musculo: 'core', peso: 0.6 }, { musculo: 'antebraco', peso: 0.4 }], progressoes: ['Prancha planche lean', 'Tuck planche', 'Advanced tuck', 'Straddle planche', 'Planche completa'] },
];

export function exerciciosDaModalidade(m: 'academia' | 'calistenia'): ExercicioCatalogo[] {
  return EXERCICIOS.filter((e) => e.modalidade === m);
}
