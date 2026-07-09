import { describe, it, expect } from 'vitest';
import { equipamentoImplicitoFaltando, validarFichaLlm, ValidacaoError } from '../validate';

function fichaCom(nome: string, equipamento: string) {
  return {
    nome: 'Treino teste',
    modalidade: 'calistenia',
    objetivo: 'forca',
    divisao: 'full body',
    duracao_estimada_min: 30,
    exercicios: [
      {
        nome,
        equipamento,
        musculo_primario: 'dorsal',
        musculos_secundarios: ['biceps'],
        series: 3,
        reps: '6-8',
        descanso_seg: 180,
        progressao_atual: 'negativa',
        proxima_progressao: 'completa',
        observacao: 'teste',
      },
    ],
  };
}

describe('equipamentoImplicitoFaltando (anti-contrabando de equipamento)', () => {
  it('barra fixa sem barra disponível → acusa', () => {
    expect(equipamentoImplicitoFaltando('Barra Fixa', ['peso_corporal', 'banco', 'tapete'])).toMatch(/barra/);
    expect(equipamentoImplicitoFaltando('Pull-up', ['peso_corporal'])).toMatch(/barra/);
  });

  it('barra fixa com barra disponível → ok', () => {
    expect(equipamentoImplicitoFaltando('Barra Fixa', ['barra_fixa', 'tapete'])).toBeNull();
    expect(equipamentoImplicitoFaltando('Muscle-up', ['barras_praca'])).toBeNull();
  });

  it('dips passam quando há banco (dips no banco existem)', () => {
    expect(equipamentoImplicitoFaltando('Dips', ['banco', 'tapete'])).toBeNull();
    expect(equipamentoImplicitoFaltando('Mergulho nas paralelas', ['peso_corporal'])).toMatch(/paralelas/);
  });

  it('movimentos neutros não disparam falso positivo', () => {
    for (const nome of ['Flexão diamante', 'Agachamento búlgaro', 'Prancha', 'Burpee', 'Pistol assistido']) {
      expect(equipamentoImplicitoFaltando(nome, ['peso_corporal', 'banco', 'tapete'])).toBeNull();
    }
  });
});

describe('validarFichaLlm com checagem semântica', () => {
  it('rejeita "Barra Fixa" rotulada com equipamento permitido (banco)', () => {
    expect(() =>
      validarFichaLlm(fichaCom('Barra Fixa', 'banco'), 'calistenia', ['peso_corporal', 'banco', 'tapete']),
    ).toThrow(ValidacaoError);
  });

  it('aceita a mesma ficha quando a barra está disponível', () => {
    const { ficha } = validarFichaLlm(fichaCom('Barra Fixa', 'barra_fixa'), 'calistenia', [
      'peso_corporal',
      'barra_fixa',
    ]);
    expect(ficha.exercicios[0].nome).toBe('Barra Fixa');
  });

  it('continua rejeitando equipamento declarado fora da lista', () => {
    expect(() =>
      validarFichaLlm(fichaCom('Flexão', 'argolas'), 'calistenia', ['peso_corporal']),
    ).toThrow(/não está em equipamentos_disponiveis/);
  });
});
