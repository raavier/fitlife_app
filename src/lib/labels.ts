import type { Musculo } from '../domain';
import type { ModalidadeApp, Qualidade, TipoCorrida } from '../db/types';

export const NOME_MUSCULO: Record<Musculo, string> = {
  peito: 'Peito',
  dorsal: 'Dorsal',
  trapezio: 'Trapézio',
  ombro_anterior: 'Ombro anterior',
  ombro_lateral: 'Ombro lateral',
  ombro_posterior: 'Ombro posterior',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  antebraco: 'Antebraço',
  quadriceps: 'Quadríceps',
  posterior_coxa: 'Posterior de coxa',
  gluteo: 'Glúteo',
  panturrilha: 'Panturrilha',
  lombar: 'Lombar',
  core: 'Core / abdômen',
  adutores: 'Adutores',
  abdutores: 'Abdutores',
};

export const NOME_MODALIDADE: Record<ModalidadeApp | 'descanso', string> = {
  academia: 'Academia',
  calistenia: 'Calistenia',
  corrida: 'Corrida',
  extra: 'Atividade extra',
  descanso: 'Descanso',
};

export const NOME_TIPO_CORRIDA: Record<TipoCorrida, string> = {
  facil: 'Fácil / conversacional',
  regenerativo: 'Regenerativo',
  longao: 'Longão',
  tempo: 'Tempo / limiar',
  intervalado: 'Intervalado (VO2máx)',
  fartlek: 'Fartlek',
  ladeira: 'Tiros em ladeira',
  ritmo_prova: 'Ritmo de prova',
  strides: 'Strides',
};

export const NOME_QUALIDADE: Record<Qualidade, string> = {
  ruim: 'Ruim',
  medio: 'Médio',
  bom: 'Bom',
};

export const COR_MODALIDADE: Record<string, string> = {
  academia: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  calistenia: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  corrida: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  extra: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  descanso: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
};

export const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const;
export const NOME_DIA: Record<string, string> = {
  dom: 'Domingo',
  seg: 'Segunda',
  ter: 'Terça',
  qua: 'Quarta',
  qui: 'Quinta',
  sex: 'Sexta',
  sab: 'Sábado',
};

export function dataBR(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function dataHoraBR(ts: number): string {
  return new Date(ts).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

export function isoHoje(): string {
  return isoDe(new Date());
}

export function isoDe(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function diaSemanaDeIso(iso: string): (typeof DIAS_SEMANA)[number] {
  const [y, m, d] = iso.split('-').map(Number);
  return DIAS_SEMANA[new Date(y, m - 1, d).getDay()];
}

export function pace(distanciaKm: number, duracaoMin: number): string {
  if (!distanciaKm || !duracaoMin) return '—';
  const minPorKm = duracaoMin / distanciaKm;
  const min = Math.floor(minPorKm);
  const seg = Math.round((minPorKm - min) * 60);
  return `${min}:${String(seg).padStart(2, '0')}/km`;
}
