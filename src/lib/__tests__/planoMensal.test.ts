import { describe, it, expect } from 'vitest';
import { validarPlanoMensal } from '../planoMensal';
import type { SemanaPlano } from '../../db/types';

// Semana começando em 2026-07-13 (segunda-feira)
function semana(numero: number, dias: [string, string, string | null][], deload = false): SemanaPlano {
  return {
    numero,
    deload,
    dias: dias.map(([data, modalidade, foco]) => ({
      data,
      modalidade: modalidade as SemanaPlano['dias'][number]['modalidade'],
      foco,
    })),
  };
}

const DIAS_UTEIS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

function planoOk(): { semanas: SemanaPlano[] } {
  // 4 semanas alternando sem violações
  const semanas: SemanaPlano[] = [];
  const base = new Date(2026, 6, 13); // seg 13/07/2026
  for (let w = 0; w < 4; w++) {
    const d = (offset: number) => {
      const dt = new Date(base);
      dt.setDate(base.getDate() + w * 7 + offset);
      return dt.toISOString().slice(0, 10);
    };
    semanas.push(
      semana(
        w + 1,
        [
          [d(0), 'corrida', 'fácil 5km'],
          [d(1), 'academia', 'empurrar'],
          [d(2), 'corrida', 'intervalado'],
          [d(3), 'calistenia', 'puxar + core'],
          [d(4), 'descanso', null],
          [d(5), 'corrida', 'longão'],
        ],
        w === 3,
      ),
    );
  }
  return { semanas };
}

describe('validarPlanoMensal', () => {
  it('plano correto passa sem erros', () => {
    const { erros } = validarPlanoMensal(planoOk(), DIAS_UTEIS);
    expect(erros).toEqual([]);
  });

  it('acusa sessão em dia indisponível', () => {
    const p = planoOk();
    // move a corrida de segunda para domingo (indisponível)
    p.semanas[0].dias[0].data = '2026-07-12';
    const { erros } = validarPlanoMensal(p, DIAS_UTEIS);
    expect(erros.some((e) => e.includes('indisponível'))).toBe(true);
  });

  it('acusa falta de semana deload', () => {
    const p = planoOk();
    p.semanas.forEach((s) => (s.deload = false));
    const { erros } = validarPlanoMensal(p, DIAS_UTEIS);
    expect(erros.some((e) => e.includes('deload'))).toBe(true);
  });

  it('acusa dois dias duros seguidos', () => {
    const p = planoOk();
    // terça vira leg day pesado logo após... quarta intervalado já é consecutivo ao leg day
    p.semanas[0].dias[1].foco = 'pernas';
    const { erros } = validarPlanoMensal(p, DIAS_UTEIS);
    expect(erros.some((e) => e.includes('dias duros seguidos'))).toBe(true);
  });

  it('avisa leg day + corrida dura em <24h', () => {
    const p = planoOk();
    p.semanas[0].dias[1].foco = 'pernas'; // ter: leg day, qua: intervalado
    const { avisos } = validarPlanoMensal(p, DIAS_UTEIS);
    expect(avisos.some((a) => a.includes('leg day e corrida dura'))).toBe(true);
  });
});
