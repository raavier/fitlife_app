// Converte os logs persistidos em Estimulo[] do domínio.
// É a ponte entre o storage e o motor de volume/recuperação: tudo
// (academia, calistenia, corrida, atividades extras) vira a MESMA representação.
import {
  agregarEstimulos,
  atividadeParaEstimulos,
  sessaoParaEstimulos,
  SERIES_POR_HORA_ESPORTE,
  SPORT_MAP,
  type Estimulo,
  type ExercicioRegistrado,
  type Musculo,
} from '../domain';
import type { EsporteCustom, LogTreino, TipoCorrida } from '../db/types';

/**
 * Extensão do SPORT_MAP para corrida (spec 8.4): longão/intervalado contam
 * como carga em quadríceps, posteriores, panturrilha e glúteos.
 * O fator escala os pesos base pela intensidade do tipo de treino.
 */
const CORRIDA_BASE: Partial<Record<Musculo, number>> = {
  quadriceps: 0.7,
  posterior_coxa: 0.6,
  panturrilha: 0.8,
  gluteo: 0.5,
  core: 0.2,
};

const FATOR_TIPO_CORRIDA: Record<TipoCorrida, number> = {
  regenerativo: 0.4,
  facil: 0.6,
  strides: 0.7,
  fartlek: 0.85,
  tempo: 0.9,
  ritmo_prova: 0.95,
  ladeira: 1.0,
  intervalado: 1.0,
  longao: 1.0,
};

export function corridaParaEstimulos(
  tipo: TipoCorrida,
  duracaoMin: number,
  rpe: number,
  timestamp: number,
): Estimulo[] {
  const horas = duracaoMin / 60;
  const fator = FATOR_TIPO_CORRIDA[tipo];
  const out: Estimulo[] = [];
  for (const [musculo, peso] of Object.entries(CORRIDA_BASE)) {
    out.push({
      musculo: musculo as Musculo,
      seriesEfetivas: peso * fator * horas * SERIES_POR_HORA_ESPORTE,
      rpe,
      timestamp,
    });
  }
  return out;
}

/** Esporte custom → estímulos, com a mesma fórmula do SPORT_MAP do domínio. */
function esporteCustomParaEstimulos(
  musculos: Partial<Record<Musculo, number>>,
  horas: number,
  rpe: number,
  timestamp: number,
): Estimulo[] {
  const out: Estimulo[] = [];
  for (const [musculo, peso] of Object.entries(musculos)) {
    if (!peso) continue;
    out.push({
      musculo: musculo as Musculo,
      seriesEfetivas: peso * horas * SERIES_POR_HORA_ESPORTE,
      rpe,
      timestamp,
    });
  }
  return out;
}

/** Converte todos os logs em estímulos agregados para o heatmap/volume. */
export function logsParaEstimulos(logs: LogTreino[], esportesCustom: EsporteCustom[]): Estimulo[] {
  const custom = new Map(esportesCustom.map((e) => [e.tipo, e.musculos]));
  const estimulos: Estimulo[] = [];

  for (const log of logs) {
    if (log.status !== 'feito') continue;

    if ((log.modalidade === 'academia' || log.modalidade === 'calistenia') && log.exercicios) {
      const exercicios: ExercicioRegistrado[] = log.exercicios.map((ex) => ({
        nome: ex.nome,
        musculoPrimario: ex.musculoPrimario,
        musculosSecundarios: ex.musculosSecundarios,
        series: ex.seriesFeitas.length > 0 ? ex.seriesFeitas.length : ex.series,
        rpe: log.rpe,
      }));
      estimulos.push(
        ...sessaoParaEstimulos({
          timestamp: log.timestamp,
          modalidade: log.modalidade,
          exercicios,
        }),
      );
    } else if (log.modalidade === 'corrida' && log.corrida) {
      estimulos.push(
        ...corridaParaEstimulos(log.corrida.tipo, log.corrida.duracaoMin, log.rpe, log.timestamp),
      );
    } else if (log.modalidade === 'extra' && log.extra) {
      if (SPORT_MAP[log.extra.tipo]) {
        estimulos.push(
          ...atividadeParaEstimulos({
            timestamp: log.timestamp,
            tipo: log.extra.tipo,
            horas: log.extra.horas,
            rpe: log.rpe,
          }),
        );
      } else {
        const mapa = custom.get(log.extra.tipo);
        if (mapa) {
          estimulos.push(...esporteCustomParaEstimulos(mapa, log.extra.horas, log.rpe, log.timestamp));
        }
      }
    }
  }

  return agregarEstimulos(estimulos);
}
