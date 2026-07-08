// Validação do plano mensal gerado pela LLM (spec seção 5 + prompts seção 6).
import type { DiaPlano, PlanoMensal, SemanaPlano } from '../db/types';
import { diaSemanaDeIso } from './labels';

const FOCOS_DUROS_CORRIDA = ['longão', 'longao', 'intervalado', 'tempo', 'limiar', 'tiro', 'ladeira', 'ritmo de prova'];
const FOCOS_PERNA = ['perna', 'pernas', 'leg', 'inferior', 'agachamento', 'quadríceps', 'quadriceps'];

export function diaEDuro(dia: DiaPlano): boolean {
  if (dia.modalidade === 'descanso') return false;
  const foco = (dia.foco ?? '').toLowerCase();
  if (dia.modalidade === 'corrida') return FOCOS_DUROS_CORRIDA.some((f) => foco.includes(f));
  return FOCOS_PERNA.some((f) => foco.includes(f));
}

export function diaEPerna(dia: DiaPlano): boolean {
  const foco = (dia.foco ?? '').toLowerCase();
  return (
    (dia.modalidade === 'academia' || dia.modalidade === 'calistenia') &&
    FOCOS_PERNA.some((f) => foco.includes(f))
  );
}

export function diaECorridaDura(dia: DiaPlano): boolean {
  return dia.modalidade === 'corrida' && diaEDuro(dia);
}

/**
 * Valida as regras de recuperação do plano mensal.
 * Retorna { erros, avisos }: erros bloqueiam salvar; avisos só sinalizam.
 */
export function validarPlanoMensal(
  plano: Pick<PlanoMensal, 'semanas'>,
  diasDisponiveis: string[],
): { erros: string[]; avisos: string[] } {
  const erros: string[] = [];
  const avisos: string[] = [];
  const semanas = plano.semanas ?? [];

  if (semanas.length < 4) erros.push(`Plano tem ${semanas.length} semanas — esperado 4.`);

  // 1. Nenhuma sessão em dia indisponível.
  const dias = semanas.flatMap((s: SemanaPlano) => s.dias);
  for (const d of dias) {
    if (d.modalidade !== 'descanso' && !diasDisponiveis.includes(diaSemanaDeIso(d.data))) {
      erros.push(`${d.data}: sessão de ${d.modalidade} em dia indisponível.`);
    }
  }

  // 2. Ao menos uma semana de deload.
  if (!semanas.some((s) => s.deload)) {
    erros.push('Nenhuma semana marcada como deload — o mês precisa de uma semana de recuo.');
  }

  // 3. Sem dois dias duros seguidos.
  const ordenados = [...dias].sort((a, b) => a.data.localeCompare(b.data));
  for (let i = 1; i < ordenados.length; i++) {
    if (diaEDuro(ordenados[i - 1]) && diaEDuro(ordenados[i]) && saoConsecutivos(ordenados[i - 1].data, ordenados[i].data)) {
      erros.push(`${ordenados[i - 1].data} e ${ordenados[i].data}: dois dias duros seguidos.`);
    }
  }

  // 4. Leg day pesado + corrida dura em <24h (dias consecutivos ou mesmo dia).
  for (let i = 0; i < ordenados.length; i++) {
    for (let j = i + 1; j < ordenados.length; j++) {
      const a = ordenados[i];
      const b = ordenados[j];
      if (!saoConsecutivos(a.data, b.data) && a.data !== b.data) continue;
      const parRuim =
        (diaEPerna(a) && diaECorridaDura(b)) || (diaECorridaDura(a) && diaEPerna(b));
      if (parRuim) {
        avisos.push(`${a.data} → ${b.data}: leg day e corrida dura em menos de 24h — considere afastar.`);
      }
    }
  }

  return { erros, avisos };
}

function saoConsecutivos(isoA: string, isoB: string): boolean {
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  return Math.abs(b - a) === 24 * 3600 * 1000;
}

/** Encontra o dia do plano para uma data ISO. */
export function diaDoPlano(plano: PlanoMensal, iso: string): DiaPlano | undefined {
  for (const s of plano.semanas) {
    const d = s.dias.find((x) => x.data === iso);
    if (d) return d;
  }
  return undefined;
}
