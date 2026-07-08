// Catálogos semente de equipamentos (spec seções 11a e 11b).
// Cada item vinculado aos músculos que trabalha, para alimentar o heatmap.
import type { Musculo } from '../domain';

export interface Equipamento {
  id: string;
  nome: string;
  modalidade: 'academia' | 'calistenia';
  grupo: string;
  musculos: Musculo[];
}

export const EQUIPAMENTOS_ACADEMIA: Equipamento[] = [
  // Pernas / glúteos
  { id: 'leg_press_45', nome: 'Leg press 45°', modalidade: 'academia', grupo: 'Pernas/Glúteos', musculos: ['quadriceps', 'gluteo', 'posterior_coxa'] },
  { id: 'leg_press_horizontal', nome: 'Leg press horizontal', modalidade: 'academia', grupo: 'Pernas/Glúteos', musculos: ['quadriceps', 'gluteo'] },
  { id: 'hack_machine', nome: 'Hack machine', modalidade: 'academia', grupo: 'Pernas/Glúteos', musculos: ['quadriceps', 'gluteo'] },
  { id: 'cadeira_extensora', nome: 'Cadeira extensora', modalidade: 'academia', grupo: 'Pernas/Glúteos', musculos: ['quadriceps'] },
  { id: 'mesa_flexora', nome: 'Cadeira/mesa flexora', modalidade: 'academia', grupo: 'Pernas/Glúteos', musculos: ['posterior_coxa'] },
  { id: 'flexora_em_pe', nome: 'Flexora em pé', modalidade: 'academia', grupo: 'Pernas/Glúteos', musculos: ['posterior_coxa'] },
  { id: 'cadeira_abdutora', nome: 'Cadeira abdutora', modalidade: 'academia', grupo: 'Pernas/Glúteos', musculos: ['abdutores', 'gluteo'] },
  { id: 'cadeira_adutora', nome: 'Cadeira adutora', modalidade: 'academia', grupo: 'Pernas/Glúteos', musculos: ['adutores'] },
  { id: 'panturrilha_em_pe', nome: 'Panturrilha em pé', modalidade: 'academia', grupo: 'Pernas/Glúteos', musculos: ['panturrilha'] },
  { id: 'panturrilha_sentado', nome: 'Panturrilha sentado', modalidade: 'academia', grupo: 'Pernas/Glúteos', musculos: ['panturrilha'] },
  { id: 'smith', nome: 'Agachamento no Smith', modalidade: 'academia', grupo: 'Pernas/Glúteos', musculos: ['quadriceps', 'gluteo', 'posterior_coxa'] },
  { id: 'gluteo_polia', nome: 'Glúteo na polia / coice', modalidade: 'academia', grupo: 'Pernas/Glúteos', musculos: ['gluteo'] },
  { id: 'hip_thrust', nome: 'Hip thrust', modalidade: 'academia', grupo: 'Pernas/Glúteos', musculos: ['gluteo', 'posterior_coxa'] },
  // Peito
  { id: 'supino_reto_livre', nome: 'Supino reto (barra livre)', modalidade: 'academia', grupo: 'Peito', musculos: ['peito', 'triceps', 'ombro_anterior'] },
  { id: 'supino_maquina', nome: 'Supino máquina', modalidade: 'academia', grupo: 'Peito', musculos: ['peito', 'triceps', 'ombro_anterior'] },
  { id: 'supino_inclinado', nome: 'Supino inclinado', modalidade: 'academia', grupo: 'Peito', musculos: ['peito', 'ombro_anterior', 'triceps'] },
  { id: 'supino_declinado', nome: 'Supino declinado', modalidade: 'academia', grupo: 'Peito', musculos: ['peito', 'triceps'] },
  { id: 'peck_deck', nome: 'Crucifixo (voador / peck deck)', modalidade: 'academia', grupo: 'Peito', musculos: ['peito'] },
  { id: 'crossover', nome: 'Crossover (polia)', modalidade: 'academia', grupo: 'Peito', musculos: ['peito'] },
  // Costas
  { id: 'puxada_frente', nome: 'Puxada frente', modalidade: 'academia', grupo: 'Costas', musculos: ['dorsal', 'biceps'] },
  { id: 'puxada_aberta', nome: 'Puxada aberta/fechada', modalidade: 'academia', grupo: 'Costas', musculos: ['dorsal', 'biceps'] },
  { id: 'remada_baixa', nome: 'Remada baixa (sentada)', modalidade: 'academia', grupo: 'Costas', musculos: ['dorsal', 'biceps', 'ombro_posterior'] },
  { id: 'remada_curvada', nome: 'Remada curvada', modalidade: 'academia', grupo: 'Costas', musculos: ['dorsal', 'biceps', 'lombar'] },
  { id: 'remada_cavalinho', nome: 'Remada cavalinho', modalidade: 'academia', grupo: 'Costas', musculos: ['dorsal', 'biceps'] },
  { id: 'remada_maquina', nome: 'Remada máquina', modalidade: 'academia', grupo: 'Costas', musculos: ['dorsal', 'biceps', 'ombro_posterior'] },
  { id: 'pullover', nome: 'Pullover', modalidade: 'academia', grupo: 'Costas', musculos: ['dorsal', 'peito'] },
  { id: 'barra_fixa_academia', nome: 'Barra fixa', modalidade: 'academia', grupo: 'Costas', musculos: ['dorsal', 'biceps', 'core'] },
  // Ombros
  { id: 'desenvolvimento', nome: 'Desenvolvimento (máquina/halteres)', modalidade: 'academia', grupo: 'Ombros', musculos: ['ombro_anterior', 'ombro_lateral', 'triceps'] },
  { id: 'elevacao_lateral', nome: 'Elevação lateral', modalidade: 'academia', grupo: 'Ombros', musculos: ['ombro_lateral'] },
  { id: 'elevacao_frontal', nome: 'Elevação frontal', modalidade: 'academia', grupo: 'Ombros', musculos: ['ombro_anterior'] },
  { id: 'crucifixo_invertido', nome: 'Crucifixo invertido', modalidade: 'academia', grupo: 'Ombros', musculos: ['ombro_posterior', 'trapezio'] },
  { id: 'encolhimento', nome: 'Encolhimento', modalidade: 'academia', grupo: 'Ombros', musculos: ['trapezio'] },
  // Braços
  { id: 'rosca_direta', nome: 'Rosca direta', modalidade: 'academia', grupo: 'Braços', musculos: ['biceps', 'antebraco'] },
  { id: 'rosca_scott', nome: 'Rosca Scott', modalidade: 'academia', grupo: 'Braços', musculos: ['biceps'] },
  { id: 'rosca_martelo', nome: 'Rosca martelo', modalidade: 'academia', grupo: 'Braços', musculos: ['biceps', 'antebraco'] },
  { id: 'rosca_alternada', nome: 'Rosca alternada', modalidade: 'academia', grupo: 'Braços', musculos: ['biceps'] },
  { id: 'triceps_pulley', nome: 'Tríceps pulley (barra/corda)', modalidade: 'academia', grupo: 'Braços', musculos: ['triceps'] },
  { id: 'triceps_testa', nome: 'Tríceps testa', modalidade: 'academia', grupo: 'Braços', musculos: ['triceps'] },
  { id: 'triceps_frances', nome: 'Tríceps francês', modalidade: 'academia', grupo: 'Braços', musculos: ['triceps'] },
  { id: 'paralelas_academia', nome: 'Mergulho / paralelas', modalidade: 'academia', grupo: 'Braços', musculos: ['triceps', 'peito', 'ombro_anterior'] },
  // Core
  { id: 'abdominal_maquina', nome: 'Abdominal máquina', modalidade: 'academia', grupo: 'Core', musculos: ['core'] },
  { id: 'prancha_area', nome: 'Prancha (área livre)', modalidade: 'academia', grupo: 'Core', musculos: ['core'] },
  { id: 'elevacao_pernas', nome: 'Elevação de pernas', modalidade: 'academia', grupo: 'Core', musculos: ['core'] },
  { id: 'cadeira_romana', nome: 'Cadeira romana', modalidade: 'academia', grupo: 'Core', musculos: ['lombar', 'gluteo', 'posterior_coxa'] },
  // Cardio
  { id: 'esteira', nome: 'Esteira', modalidade: 'academia', grupo: 'Cardio', musculos: ['quadriceps', 'panturrilha', 'posterior_coxa'] },
  { id: 'bike', nome: 'Bike (vertical/horizontal)', modalidade: 'academia', grupo: 'Cardio', musculos: ['quadriceps', 'gluteo', 'panturrilha'] },
  { id: 'eliptico', nome: 'Elíptico', modalidade: 'academia', grupo: 'Cardio', musculos: ['quadriceps', 'gluteo'] },
  { id: 'escada', nome: 'Escada', modalidade: 'academia', grupo: 'Cardio', musculos: ['quadriceps', 'gluteo', 'panturrilha'] },
  { id: 'remo_ergometro', nome: 'Remo ergômetro', modalidade: 'academia', grupo: 'Cardio', musculos: ['dorsal', 'quadriceps', 'biceps', 'lombar'] },
  // Livres / funcional
  { id: 'halteres', nome: 'Halteres', modalidade: 'academia', grupo: 'Livres/Funcional', musculos: [] },
  { id: 'barras_anilhas', nome: 'Barras e anilhas', modalidade: 'academia', grupo: 'Livres/Funcional', musculos: [] },
  { id: 'kettlebell', nome: 'Kettlebell', modalidade: 'academia', grupo: 'Livres/Funcional', musculos: [] },
  { id: 'banco_ajustavel', nome: 'Banco ajustável', modalidade: 'academia', grupo: 'Livres/Funcional', musculos: [] },
  { id: 'corda_naval', nome: 'Corda naval', modalidade: 'academia', grupo: 'Livres/Funcional', musculos: ['ombro_anterior', 'core', 'antebraco'] },
  { id: 'trx_academia', nome: 'TRX', modalidade: 'academia', grupo: 'Livres/Funcional', musculos: ['core', 'dorsal', 'peito'] },
  { id: 'caixa_salto', nome: 'Caixa de salto', modalidade: 'academia', grupo: 'Livres/Funcional', musculos: ['quadriceps', 'gluteo', 'panturrilha'] },
];

export const EQUIPAMENTOS_CALISTENIA: Equipamento[] = [
  { id: 'peso_corporal', nome: 'Espaço livre / só peso corporal', modalidade: 'calistenia', grupo: 'Base', musculos: [] },
  { id: 'barra_fixa', nome: 'Barra fixa', modalidade: 'calistenia', grupo: 'Base', musculos: ['dorsal', 'biceps', 'core'] },
  { id: 'paralelas', nome: 'Barras paralelas / parallettes', modalidade: 'calistenia', grupo: 'Base', musculos: ['triceps', 'peito', 'core'] },
  { id: 'banco', nome: 'Banco / caixa / degrau', modalidade: 'calistenia', grupo: 'Base', musculos: ['quadriceps', 'gluteo', 'triceps'] },
  { id: 'tapete', nome: 'Tapete / colchonete', modalidade: 'calistenia', grupo: 'Base', musculos: ['core'] },
  { id: 'argolas', nome: 'Argolas', modalidade: 'calistenia', grupo: 'Avançado', musculos: ['dorsal', 'peito', 'core'] },
  { id: 'elasticos', nome: 'Elásticos / faixas', modalidade: 'calistenia', grupo: 'Assistência', musculos: [] },
  { id: 'corda_pular', nome: 'Corda de pular', modalidade: 'calistenia', grupo: 'Condicionamento', musculos: ['panturrilha', 'quadriceps'] },
  { id: 'trx', nome: 'TRX / fita de suspensão', modalidade: 'calistenia', grupo: 'Base', musculos: ['dorsal', 'peito', 'core'] },
  { id: 'barras_praca', nome: 'Playground / barras de praça', modalidade: 'calistenia', grupo: 'Base', musculos: ['dorsal', 'peito', 'triceps'] },
];

export const TODOS_EQUIPAMENTOS = [...EQUIPAMENTOS_ACADEMIA, ...EQUIPAMENTOS_CALISTENIA];

export function nomeEquipamento(id: string): string {
  return TODOS_EQUIPAMENTOS.find((e) => e.id === id)?.nome ?? id;
}
