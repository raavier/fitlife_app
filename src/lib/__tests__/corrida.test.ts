import { describe, it, expect } from 'vitest';
import { avisoAumentoCarga, gerarPlanoCorrida, percentualForte, validarPlanoCorrida } from '../corrida';

describe('gerarPlanoCorrida (periodização)', () => {
  const plano = gerarPlanoCorrida({
    meta: 'correr 10km',
    nivel: 'intermediario',
    diasPorSemana: 4,
    kmSemanaAtual: 20,
  });

  it('começa pela base e nunca a pula (mínimo 2 semanas)', () => {
    expect(plano.semanas[0].fase).toBe('base');
    expect(plano.semanas.filter((s) => s.fase === 'base').length).toBeGreaterThanOrEqual(2);
  });

  it('sem prova não há taper', () => {
    expect(plano.semanas.some((s) => s.fase === 'taper')).toBe(false);
  });

  it('com prova há taper com corte de volume mantendo intensidade', () => {
    const alvo = new Date(Date.now() + 12 * 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const comProva = gerarPlanoCorrida({
      meta: '10km em 50min',
      dataAlvo: alvo,
      nivel: 'intermediario',
      diasPorSemana: 4,
      kmSemanaAtual: 25,
    });
    const tapers = comProva.semanas.filter((s) => s.fase === 'taper');
    expect(tapers.length).toBeGreaterThanOrEqual(2);
    const pico = comProva.semanas.filter((s) => s.fase === 'pico').at(-1)!;
    const ultima = tapers.at(-1)!;
    expect(ultima.kmTotal).toBeLessThan(pico.kmTotal * 0.75); // cortou bem o volume
    expect(ultima.sessoes.some((x) => x.tipo === 'intervalado')).toBe(true); // manteve tiros
  });

  it('passa na própria validação (≤10%, deload, 80/20, base limpa)', () => {
    expect(validarPlanoCorrida(plano)).toEqual([]);
  });

  it('base não tem intervalado/tempo, só fácil + strides + longão', () => {
    for (const s of plano.semanas.filter((x) => x.fase === 'base')) {
      const tipos = s.sessoes.map((x) => x.tipo);
      expect(tipos).not.toContain('intervalado');
      expect(tipos).not.toContain('tempo');
      expect(tipos).toContain('strides');
    }
  });

  it('tem deload a cada bloco de 4 semanas', () => {
    expect(plano.semanas.filter((s) => s.deload).length).toBeGreaterThanOrEqual(1);
  });

  it('respeita a regra 80/20 em todas as semanas', () => {
    for (const s of plano.semanas) {
      expect(percentualForte(s)).toBeLessThanOrEqual(0.3);
    }
  });
});

describe('validarPlanoCorrida', () => {
  it('acusa aumento de volume acima de 10%', () => {
    const erros = validarPlanoCorrida({
      semanas: [
        { numero: 1, fase: 'base', kmTotal: 20, deload: false, sessoes: [] },
        { numero: 2, fase: 'base', kmTotal: 26, deload: false, sessoes: [] },
        { numero: 3, fase: 'base', kmTotal: 27, deload: false, sessoes: [] },
        { numero: 4, fase: 'base', kmTotal: 20, deload: true, sessoes: [] },
      ],
    });
    expect(erros.some((e) => e.includes('acima de 10%'))).toBe(true);
  });

  it('acusa falta de deload', () => {
    const semanas = [1, 2, 3, 4].map((n) => ({
      numero: n,
      fase: 'base' as const,
      kmTotal: 20,
      deload: false,
      sessoes: [],
    }));
    expect(validarPlanoCorrida({ semanas }).some((e) => e.includes('deload'))).toBe(true);
  });
});

describe('avisoAumentoCarga (widget semanal)', () => {
  it('avisa quando o km da semana sobe mais de 10%', () => {
    expect(avisoAumentoCarga([20, 26])).toMatch(/30%/);
  });
  it('não avisa dentro do limite', () => {
    expect(avisoAumentoCarga([20, 21])).toBeNull();
  });
});
