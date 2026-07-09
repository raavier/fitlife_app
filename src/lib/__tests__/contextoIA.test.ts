import { describe, it, expect } from 'vitest';
import { avisosFichaVsRecuperacao, formatarSnapshot, formatarUltimoTreino } from '../contextoIA';
import type { LogTreino } from '../../db/types';
import type { Musculo, RecuperacaoMusculo } from '../../domain';

const rec = (
  musculo: Musculo,
  status: RecuperacaoMusculo['status'],
  horas = 0,
): RecuperacaoMusculo => ({
  musculo,
  status,
  fadiga: status === 'fadigado' ? 0.8 : status === 'recuperando' ? 0.5 : 0,
  horasAteLiberar: horas,
});

describe('formatarSnapshot', () => {
  it('lista fadigados e recuperando com horas, e volume com status', () => {
    const texto = formatarSnapshot({
      nivel: 'intermediario',
      recuperacoes: {
        quadriceps: rec('quadriceps', 'fadigado', 44),
        core: rec('core', 'recuperando', 20),
        peito: rec('peito', 'pronto'),
      },
      volume: { peito: 14, dorsal: 6 },
    });
    expect(texto).toContain('musculos_fadigados_agora: quadriceps (libera em ~44h)');
    expect(texto).toContain('musculos_recuperando: core (~20h)');
    expect(texto).toContain('peito 14 (dentro)');
    expect(texto).toContain('dorsal 6 (abaixo)');
    expect(texto).toContain('alvo_10-20');
  });

  it('sem treinos: campos viram "nenhum"/"sem treinos"', () => {
    const texto = formatarSnapshot({ nivel: 'iniciante', recuperacoes: {}, volume: {} });
    expect(texto).toContain('musculos_fadigados_agora: nenhum');
    expect(texto).toContain('sem treinos ainda nesta semana');
    expect(texto).toContain('alvo_6-10'); // iniciante
  });
});

describe('formatarUltimoTreino', () => {
  const DIA = 24 * 3600 * 1000;
  it('resume exercícios com séries feitas, carga e variação', () => {
    const agora = Date.now();
    const log: LogTreino = {
      timestamp: agora - 12 * DIA,
      modalidade: 'calistenia',
      rpe: 8,
      qualidade: 'bom',
      status: 'feito',
      exercicios: [
        {
          nome: 'Flexão',
          equipamento: 'peso_corporal',
          musculoPrimario: 'peito',
          musculosSecundarios: [],
          series: 3,
          reps: '6-8',
          descansoSeg: 120,
          progressaoAtual: 'declinada',
          seriesFeitas: [{ reps: 8 }, { reps: 7 }, { reps: 6 }],
        },
        {
          nome: 'Remada',
          equipamento: 'trx',
          musculoPrimario: 'dorsal',
          musculosSecundarios: [],
          series: 3,
          reps: '8-10',
          descansoSeg: 90,
          seriesFeitas: [{ reps: 10, carga: 20 }],
        },
      ],
    };
    const texto = formatarUltimoTreino(log, agora);
    expect(texto).toContain('há 12 dia(s)');
    expect(texto).toContain('RPE 8, qualidade bom');
    expect(texto).toContain('Flexão [3x6-8, variação: declinada]');
    expect(texto).toContain('Remada [1x8-10, 20kg]');
  });

  it('sem treino anterior informa "nenhum registrado"', () => {
    expect(formatarUltimoTreino(undefined)).toContain('nenhum registrado');
  });
});

describe('avisosFichaVsRecuperacao', () => {
  const exercicio = (nome: string, musculo: Musculo) => ({
    nome,
    equipamento: 'peso_corporal',
    musculoPrimario: musculo,
    musculosSecundarios: [],
    series: 3,
    reps: '8-12',
    descansoSeg: 90,
  });

  it('avisa uma vez por músculo fadigado', () => {
    const avisos = avisosFichaVsRecuperacao(
      { exercicios: [exercicio('Agachamento', 'quadriceps'), exercicio('Afundo', 'quadriceps'), exercicio('Flexão', 'peito')] },
      { quadriceps: rec('quadriceps', 'fadigado', 30), peito: rec('peito', 'pronto') },
    );
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('Agachamento');
    expect(avisos[0]).toContain('~30h');
  });

  it('sem músculos fadigados, sem avisos', () => {
    const avisos = avisosFichaVsRecuperacao(
      { exercicios: [exercicio('Flexão', 'peito')] },
      { peito: rec('peito', 'recuperando', 10) },
    );
    expect(avisos).toHaveLength(0);
  });
});
