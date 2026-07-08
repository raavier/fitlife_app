import { describe, it, expect } from 'vitest';
import { corridaParaEstimulos, logsParaEstimulos } from '../estimulos';
import type { LogTreino } from '../../db/types';

const t0 = Date.UTC(2026, 6, 6, 12, 0, 0);

describe('corridaParaEstimulos (corrida entra no heatmap)', () => {
  it('longão gera estímulo em quadríceps, posteriores, panturrilha e glúteo', () => {
    const est = corridaParaEstimulos('longao', 60, 7, t0);
    const musculos = est.map((e) => e.musculo);
    expect(musculos).toContain('quadriceps');
    expect(musculos).toContain('posterior_coxa');
    expect(musculos).toContain('panturrilha');
    expect(musculos).toContain('gluteo');
  });

  it('corrida fácil gera menos carga que longão de mesma duração', () => {
    const facil = corridaParaEstimulos('facil', 60, 6, t0);
    const longao = corridaParaEstimulos('longao', 60, 6, t0);
    const quadF = facil.find((e) => e.musculo === 'quadriceps')!;
    const quadL = longao.find((e) => e.musculo === 'quadriceps')!;
    expect(quadF.seriesEfetivas).toBeLessThan(quadL.seriesEfetivas);
  });
});

describe('logsParaEstimulos', () => {
  it('ignora logs não feitos', () => {
    const logs: LogTreino[] = [
      {
        timestamp: t0,
        modalidade: 'corrida',
        corrida: { tipo: 'facil', distanciaKm: 5, duracaoMin: 30 },
        rpe: 6,
        status: 'nao_feito',
      },
    ];
    expect(logsParaEstimulos(logs, [])).toHaveLength(0);
  });

  it('usa séries feitas (não planejadas) quando existem', () => {
    const logs: LogTreino[] = [
      {
        timestamp: t0,
        modalidade: 'academia',
        rpe: 8,
        status: 'feito',
        exercicios: [
          {
            nome: 'Supino',
            equipamento: 'supino_maquina',
            musculoPrimario: 'peito',
            musculosSecundarios: [],
            series: 4,
            reps: '8-12',
            descansoSeg: 90,
            seriesFeitas: [{ reps: 10 }, { reps: 9 }], // fez só 2
          },
        ],
      },
    ];
    const est = logsParaEstimulos(logs, []);
    expect(est.find((e) => e.musculo === 'peito')?.seriesEfetivas).toBe(2);
  });

  it('esporte custom usa o mapeamento manual', () => {
    const logs: LogTreino[] = [
      {
        timestamp: t0,
        modalidade: 'extra',
        extra: { tipo: 'escalada', horas: 2 },
        rpe: 7,
        status: 'feito',
      },
    ];
    const est = logsParaEstimulos(logs, [
      { tipo: 'escalada', nome: 'Escalada', musculos: { antebraco: 0.9, dorsal: 0.6 } },
    ]);
    // 0.9 * 2h * 3 séries/h = 5.4
    expect(est.find((e) => e.musculo === 'antebraco')?.seriesEfetivas).toBeCloseTo(5.4);
    expect(est.find((e) => e.musculo === 'dorsal')?.seriesEfetivas).toBeCloseTo(3.6);
  });

  it('esporte desconhecido sem mapeamento não gera estímulos', () => {
    const logs: LogTreino[] = [
      { timestamp: t0, modalidade: 'extra', extra: { tipo: 'xadrez', horas: 1 }, rpe: 2, status: 'feito' },
    ];
    expect(logsParaEstimulos(logs, [])).toHaveLength(0);
  });
});
