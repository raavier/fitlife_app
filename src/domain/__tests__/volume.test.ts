import { describe, it, expect } from 'vitest';
import {
  exercicioParaEstimulos,
  sessaoParaEstimulos,
  atividadeParaEstimulos,
  agregarEstimulos,
  volumeSemanalPorMusculo,
  statusVolume,
  type ExercicioRegistrado,
  type SessaoTreino,
} from '../index.js';

// Helpers de tempo
const DIA = 86_400_000;
const t0 = Date.UTC(2026, 6, 6, 12, 0, 0); // segunda 06/07/2026 12:00
const semanaInicio = Date.UTC(2026, 6, 6, 0, 0, 0);
const semanaFim = semanaInicio + 7 * DIA;

const supino = (series: number, rpe = 8): ExercicioRegistrado => ({
  nome: 'Supino reto',
  musculoPrimario: 'peito',
  musculosSecundarios: [
    { musculo: 'triceps', peso: 0.5 },
    { musculo: 'ombro_anterior', peso: 0.4 },
  ],
  series,
  rpe,
});

const desenvolvimento = (series: number, rpe = 8): ExercicioRegistrado => ({
  nome: 'Desenvolvimento',
  musculoPrimario: 'ombro_anterior',
  musculosSecundarios: [{ musculo: 'triceps', peso: 0.5 }],
  series,
  rpe,
});

describe('ativação indireta (exercício -> estímulos)', () => {
  it('primário recebe 100% das séries', () => {
    const est = exercicioParaEstimulos(supino(4), t0);
    const peito = est.find((e) => e.musculo === 'peito')!;
    expect(peito.seriesEfetivas).toBe(4);
  });

  it('secundários recebem séries * peso', () => {
    const est = exercicioParaEstimulos(supino(4), t0);
    expect(est.find((e) => e.musculo === 'triceps')!.seriesEfetivas).toBeCloseTo(2.0);
    expect(est.find((e) => e.musculo === 'ombro_anterior')!.seriesEfetivas).toBeCloseTo(1.6);
  });
});

describe('volume semanal por músculo', () => {
  it('soma séries diretas de exercícios na semana', () => {
    const sessao: SessaoTreino = {
      timestamp: t0,
      modalidade: 'academia',
      exercicios: [supino(4)],
    };
    const vol = volumeSemanalPorMusculo(sessaoParaEstimulos(sessao), semanaInicio, semanaFim);
    expect(vol.peito).toBeCloseTo(4);
  });

  it('acumula ativação indireta de MÚLTIPLOS exercícios no mesmo músculo', () => {
    // supino (triceps 0.5*4=2) + desenvolvimento (triceps 0.5*3=1.5) = 3.5 séries efetivas de tríceps
    const sessao: SessaoTreino = {
      timestamp: t0,
      modalidade: 'academia',
      exercicios: [supino(4), desenvolvimento(3)],
    };
    const vol = volumeSemanalPorMusculo(sessaoParaEstimulos(sessao), semanaInicio, semanaFim);
    expect(vol.triceps).toBeCloseTo(3.5);
    // ombro_anterior: primário no desenvolvimento (3) + secundário no supino (1.6) = 4.6
    expect(vol.ombro_anterior).toBeCloseTo(4.6);
  });

  it('acumula ao longo de várias sessões da semana', () => {
    const seg: SessaoTreino = { timestamp: t0, modalidade: 'academia', exercicios: [supino(4)] };
    const qui: SessaoTreino = { timestamp: t0 + 3 * DIA, modalidade: 'academia', exercicios: [supino(5)] };
    const est = [...sessaoParaEstimulos(seg), ...sessaoParaEstimulos(qui)];
    const vol = volumeSemanalPorMusculo(est, semanaInicio, semanaFim);
    expect(vol.peito).toBeCloseTo(9); // 4 + 5
  });

  it('ignora sessões fora da janela da semana', () => {
    const semanaPassada: SessaoTreino = {
      timestamp: t0 - 8 * DIA,
      modalidade: 'academia',
      exercicios: [supino(10)],
    };
    const vol = volumeSemanalPorMusculo(sessaoParaEstimulos(semanaPassada), semanaInicio, semanaFim);
    expect(vol.peito ?? 0).toBe(0);
  });

  it('atividade extra (futebol) contribui para as pernas no volume', () => {
    // futebol 2h, quadriceps peso 0.8 -> 0.8 * 2 * 3 = 4.8 séries efetivas
    const est = atividadeParaEstimulos({ timestamp: t0, tipo: 'futebol', horas: 2, rpe: 7 });
    const vol = volumeSemanalPorMusculo(est, semanaInicio, semanaFim);
    expect(vol.quadriceps).toBeCloseTo(4.8);
    expect(vol.panturrilha).toBeCloseTo(3.6); // 0.6*2*3
  });

  it('esporte fora do mapa não gera estímulos (pede mapeamento manual)', () => {
    const est = atividadeParaEstimulos({ timestamp: t0, tipo: 'xadrez', horas: 2, rpe: 2 });
    expect(est).toHaveLength(0);
  });
});

describe('agregação de estímulos (mesmo músculo + timestamp)', () => {
  it('soma séries e usa o maior RPE', () => {
    const sessao: SessaoTreino = {
      timestamp: t0,
      modalidade: 'academia',
      exercicios: [supino(4, 8), desenvolvimento(3, 9)], // triceps aparece nos dois
    };
    const agg = agregarEstimulos(sessaoParaEstimulos(sessao));
    const triceps = agg.filter((e) => e.musculo === 'triceps');
    expect(triceps).toHaveLength(1); // um único estímulo agregado
    expect(triceps[0].seriesEfetivas).toBeCloseTo(3.5);
    expect(triceps[0].rpe).toBe(9);
  });
});

describe('statusVolume vs alvo', () => {
  it('classifica abaixo/dentro/acima para intermediário (10-20)', () => {
    expect(statusVolume(8, 'intermediario')).toBe('abaixo');
    expect(statusVolume(15, 'intermediario')).toBe('dentro');
    expect(statusVolume(24, 'intermediario')).toBe('acima');
  });

  it('usa alvo menor para iniciante (6-10)', () => {
    expect(statusVolume(8, 'iniciante')).toBe('dentro');
    expect(statusVolume(12, 'iniciante')).toBe('acima');
  });
});
