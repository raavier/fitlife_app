import { describe, it, expect } from 'vitest';
import {
  recuperacaoDoMusculo,
  fadigaEm,
  horasRecuperacao,
  sessaoParaEstimulos,
  atividadeParaEstimulos,
  type Estimulo,
  type SessaoTreino,
  type ExercicioRegistrado,
} from '../index.js';

const HORA = 3_600_000;
const agora = Date.UTC(2026, 6, 10, 12, 0, 0);
const hAtras = (h: number) => agora - h * HORA;

const agachamento = (series: number, rpe: number): ExercicioRegistrado => ({
  nome: 'Agachamento',
  musculoPrimario: 'quadriceps',
  musculosSecundarios: [
    { musculo: 'gluteo', peso: 0.7 },
    { musculo: 'posterior_coxa', peso: 0.4 },
  ],
  series,
  rpe,
});

// leg day pesado como estímulos, ocorrido `h` horas atrás
const legDay = (h: number, series = 6, rpe = 9): Estimulo[] => {
  const s: SessaoTreino = { timestamp: hAtras(h), modalidade: 'academia', exercicios: [agachamento(series, rpe)] };
  return sessaoParaEstimulos(s);
};

describe('horasRecuperacao', () => {
  it('sessão pesada exige mais recuperação que sessão leve (mesmo músculo)', () => {
    const pesada = horasRecuperacao('quadriceps', 6, 9);
    const leve = horasRecuperacao('quadriceps', 2, 5);
    expect(pesada).toBeGreaterThan(leve);
    // quadríceps: janela 48-72h; pesada deve estar perto do topo, leve perto do piso
    expect(pesada).toBeGreaterThan(60);
    expect(leve).toBeLessThan(60);
  });

  it('músculo pequeno recupera mais rápido que grande sob o mesmo estresse', () => {
    expect(horasRecuperacao('biceps', 6, 9)).toBeLessThan(horasRecuperacao('quadriceps', 6, 9));
  });
});

describe('status de recuperação', () => {
  it('logo após leg day pesado -> fadigado (vermelho)', () => {
    const r = recuperacaoDoMusculo('quadriceps', legDay(1), agora);
    expect(r.status).toBe('fadigado');
    expect(r.fadiga).toBeGreaterThan(0.66);
    expect(r.horasAteLiberar).toBeGreaterThan(0);
  });

  it('passada a janela de recuperação -> pronto (verde), fadiga ~0', () => {
    const r = recuperacaoDoMusculo('quadriceps', legDay(80), agora); // 80h > 72h
    expect(r.status).toBe('pronto');
    expect(r.fadiga).toBeCloseTo(0, 5);
    expect(r.horasAteLiberar).toBe(0);
  });

  it('no meio da janela -> recuperando (amarelo)', () => {
    // ~40h após leg day pesado (rec ~ 68h) => resto ~0.4
    const r = recuperacaoDoMusculo('quadriceps', legDay(40), agora);
    expect(r.status).toBe('recuperando');
    expect(r.fadiga).toBeGreaterThan(0.33);
    expect(r.fadiga).toBeLessThan(0.66);
  });

  it('estímulo no futuro é ignorado', () => {
    const futuro: Estimulo[] = [{ musculo: 'peito', seriesEfetivas: 6, rpe: 9, timestamp: agora + 10 * HORA }];
    expect(fadigaEm('peito', futuro, agora)).toBe(0);
  });
});

describe('empilhamento de sessões (fadiga acumulada)', () => {
  it('duas sessões próximas geram mais fadiga que uma só', () => {
    const uma = fadigaEm('quadriceps', legDay(30), agora);
    const duas = fadigaEm('quadriceps', [...legDay(30), ...legDay(6)], agora);
    expect(duas).toBeGreaterThan(uma);
  });

  it('fadiga é limitada em 1.0 mesmo com muitas sessões', () => {
    const muitas = [...legDay(1), ...legDay(2), ...legDay(3), ...legDay(4)];
    expect(fadigaEm('quadriceps', muitas, agora)).toBeLessThanOrEqual(1);
  });
});

describe('interação corrida/esporte x musculação (o diferencial)', () => {
  it('futebol soma fadiga nas pernas junto do leg day', () => {
    const soLeg = fadigaEm('quadriceps', legDay(20, 4, 7), agora);
    const futebol = atividadeParaEstimulos({ timestamp: hAtras(4), tipo: 'futebol', horas: 2, rpe: 8 });
    const legMaisFutebol = fadigaEm('quadriceps', [...legDay(20, 4, 7), ...futebol], agora);
    expect(legMaisFutebol).toBeGreaterThan(soLeg);
  });

  it('leg day + futebol dentro de 24h deixa o quadríceps fadigado (dispara alerta)', () => {
    const estimulos = [
      ...legDay(20, 6, 9), // leg day pesado 20h atrás
      ...atividadeParaEstimulos({ timestamp: hAtras(3), tipo: 'futebol', horas: 2, rpe: 8 }), // futebol 3h atrás
    ];
    const r = recuperacaoDoMusculo('quadriceps', estimulos, agora);
    expect(r.status).toBe('fadigado');
  });
});
