// Agregações locais para o relatório de fim de ciclo (spec seção 7).
// Os NÚMEROS são calculados aqui; a LLM só recebe o payload e redige o resumo.
import { volumeSemanalPorMusculo, type Estimulo, type Musculo } from '../domain';
import type { LogTreino, PlanoMensal, Qualidade } from '../db/types';
import { diaSemanaDeIso, pace } from './labels';

const DIA_MS = 24 * 3600 * 1000;

export interface Adesao {
  planejado: number;
  feito: number;
}

export interface DadosRelatorio {
  periodo: { inicio: string; fim: string };
  adesao: Record<'corrida' | 'academia' | 'calistenia', Adesao>;
  qualidade: {
    bom: number;
    medio: number;
    ruim: number;
    porModalidade: Record<string, Record<Qualidade, number>>;
    porDiaSemana: Record<string, Record<Qualidade, number>>;
  };
  volumePorGrupo: Partial<Record<Musculo, number>>; // séries/semana média
  corrida: { kmPorSemana: number[]; paceMedio: string };
  extras: { tipo: string; horas: number }[];
  observacoes: string[];
}

export function agregarRelatorio(
  plano: PlanoMensal | undefined,
  logs: LogTreino[],
  estimulos: Estimulo[],
  inicioMs: number,
  fimMs: number,
): DadosRelatorio {
  const logsPeriodo = logs.filter(
    (l) => l.timestamp >= inicioMs && l.timestamp < fimMs && l.status === 'feito',
  );

  // Adesão: planejado (do plano mensal) × feito
  const adesao: DadosRelatorio['adesao'] = {
    corrida: { planejado: 0, feito: 0 },
    academia: { planejado: 0, feito: 0 },
    calistenia: { planejado: 0, feito: 0 },
  };
  if (plano) {
    for (const s of plano.semanas) {
      for (const d of s.dias) {
        if (d.modalidade !== 'descanso') adesao[d.modalidade].planejado++;
      }
    }
  }
  for (const l of logsPeriodo) {
    if (l.modalidade === 'corrida' || l.modalidade === 'academia' || l.modalidade === 'calistenia') {
      adesao[l.modalidade].feito++;
    }
  }

  // Qualidade
  const qualidade: DadosRelatorio['qualidade'] = {
    bom: 0,
    medio: 0,
    ruim: 0,
    porModalidade: {},
    porDiaSemana: {},
  };
  for (const l of logsPeriodo) {
    if (!l.qualidade) continue;
    qualidade[l.qualidade]++;
    const dia = diaSemanaDeIso(new Date(l.timestamp).toISOString().slice(0, 10));
    qualidade.porModalidade[l.modalidade] ??= { bom: 0, medio: 0, ruim: 0 };
    qualidade.porModalidade[l.modalidade][l.qualidade]++;
    qualidade.porDiaSemana[dia] ??= { bom: 0, medio: 0, ruim: 0 };
    qualidade.porDiaSemana[dia][l.qualidade]++;
  }

  // Volume médio semanal por grupo
  const numSemanas = Math.max(1, Math.round((fimMs - inicioMs) / (7 * DIA_MS)));
  const volumeTotal = volumeSemanalPorMusculo(estimulos, inicioMs, fimMs);
  const volumePorGrupo: Partial<Record<Musculo, number>> = {};
  for (const [m, v] of Object.entries(volumeTotal)) {
    volumePorGrupo[m as Musculo] = Math.round(((v as number) / numSemanas) * 10) / 10;
  }

  // Corrida: km por semana + pace médio
  const kmPorSemana: number[] = [];
  for (let w = 0; w < numSemanas; w++) {
    const ini = inicioMs + w * 7 * DIA_MS;
    const fim = ini + 7 * DIA_MS;
    const km = logsPeriodo
      .filter((l) => l.modalidade === 'corrida' && l.corrida && l.timestamp >= ini && l.timestamp < fim)
      .reduce((s, l) => s + (l.corrida?.distanciaKm ?? 0), 0);
    kmPorSemana.push(Math.round(km * 10) / 10);
  }
  const corridas = logsPeriodo.filter((l) => l.modalidade === 'corrida' && l.corrida);
  const totKm = corridas.reduce((s, l) => s + (l.corrida?.distanciaKm ?? 0), 0);
  const totMin = corridas.reduce((s, l) => s + (l.corrida?.duracaoMin ?? 0), 0);

  // Extras
  const extrasMap = new Map<string, number>();
  for (const l of logsPeriodo) {
    if (l.modalidade === 'extra' && l.extra) {
      extrasMap.set(l.extra.tipo, (extrasMap.get(l.extra.tipo) ?? 0) + l.extra.horas);
    }
  }

  return {
    periodo: {
      inicio: new Date(inicioMs).toLocaleDateString('pt-BR'),
      fim: new Date(fimMs).toLocaleDateString('pt-BR'),
    },
    adesao,
    qualidade,
    volumePorGrupo,
    corrida: { kmPorSemana, paceMedio: totKm > 0 ? pace(totKm, totMin) : '—' },
    extras: [...extrasMap.entries()].map(([tipo, horas]) => ({ tipo, horas: Math.round(horas * 10) / 10 })),
    observacoes: logsPeriodo.map((l) => l.observacao).filter((x): x is string => !!x),
  };
}
