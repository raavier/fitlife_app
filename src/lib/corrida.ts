// Gerador LOCAL do plano de corrida periodizado (spec seção 2).
// Regras: Base → Build → Pico → Taper (taper só com prova); aumento semanal
// ≤10%; deload a cada 4 semanas (~-25%); 80/20 fácil/forte; base nunca pulada.
import type {
  FaseCorrida,
  PlanoCorrida,
  SemanaCorrida,
  SessaoCorridaPlanejada,
  TipoCorrida,
} from '../db/types';
import type { Nivel } from '../domain';

export interface ParamsPlanoCorrida {
  meta: string;
  dataAlvo?: string; // YYYY-MM-DD; ausente = "sem prova, só evoluir"
  nivel: Nivel;
  diasPorSemana: number; // 2..6
  kmSemanaAtual?: number; // volume atual do usuário
}

const KM_INICIAL_PADRAO: Record<Nivel, number> = {
  iniciante: 10,
  intermediario: 20,
  avancado: 35,
};

export function gerarPlanoCorrida(p: ParamsPlanoCorrida): Omit<PlanoCorrida, 'id'> {
  const temProva = !!p.dataAlvo;
  let totalSemanas = 8;
  if (p.dataAlvo) {
    const diff = Math.round(
      (new Date(p.dataAlvo).getTime() - Date.now()) / (7 * 24 * 3600 * 1000),
    );
    totalSemanas = Math.max(4, Math.min(16, diff));
  }

  // Distribuição de fases. Base nunca é pulada: mínimo 2 semanas.
  const taper = temProva ? Math.min(3, Math.max(2, Math.round(totalSemanas * 0.15))) : 0;
  const base = Math.max(2, Math.round(totalSemanas * (temProva ? 0.35 : 0.45)));
  const pico = temProva ? Math.max(1, Math.round(totalSemanas * 0.15)) : Math.round(totalSemanas * 0.2);
  const build = Math.max(1, totalSemanas - base - pico - taper);

  const fases: FaseCorrida[] = [
    ...Array<FaseCorrida>(base).fill('base'),
    ...Array<FaseCorrida>(build).fill('build'),
    ...Array<FaseCorrida>(pico).fill('pico'),
    ...Array<FaseCorrida>(taper).fill('taper'),
  ];

  const kmInicial = p.kmSemanaAtual && p.kmSemanaAtual > 0 ? p.kmSemanaAtual : KM_INICIAL_PADRAO[p.nivel];
  const semanas: SemanaCorrida[] = [];
  let kmAnterior = kmInicial;
  let kmPrePico = kmInicial;

  fases.forEach((fase, i) => {
    const numero = i + 1;
    // Deload a cada 4ª semana (exceto no taper, que já reduz).
    const deload = fase !== 'taper' && numero % 4 === 0;
    let km: number;

    if (fase === 'taper') {
      // Cortar 40-60% em relação ao pico, mantendo intensidade.
      const idxTaper = numero - (totalSemanas - taper);
      const corte = 0.6 - idxTaper * 0.15; // 45%, 30%... do pico? -> fator restante
      km = Math.round(kmPrePico * Math.max(0.4, corte + 0.25));
    } else if (deload) {
      km = Math.round(kmAnterior * 0.75); // recuo de ~25%
    } else if (fase === 'pico') {
      km = kmAnterior; // volume estabiliza
      kmPrePico = km;
    } else {
      // crescimento ≤10% sobre a última semana "cheia"
      const referencia = semanas.length > 0 && semanas[semanas.length - 1].deload
        ? semanas[semanas.length - 2]?.kmTotal ?? kmAnterior
        : kmAnterior;
      // floor para nunca estourar o limite de 10% por arredondamento
      km = i === 0 ? kmInicial : Math.floor(referencia * 1.1);
      kmPrePico = km;
    }

    semanas.push({
      numero,
      fase,
      kmTotal: km,
      deload,
      sessoes: montarSessoes(fase, km, p.diasPorSemana, deload),
    });
    kmAnterior = km;
  });

  return {
    meta: p.meta,
    dataAlvo: p.dataAlvo,
    nivel: p.nivel,
    diasPorSemana: p.diasPorSemana,
    kmSemanaInicial: kmInicial,
    semanas,
    ativo: 1,
    criadoEm: Date.now(),
  };
}

/** Monta as sessões da semana respeitando 80/20 e o caráter da fase. */
function montarSessoes(
  fase: FaseCorrida,
  kmTotal: number,
  dias: number,
  deload: boolean,
): SessaoCorridaPlanejada[] {
  const sessoes: SessaoCorridaPlanejada[] = [];
  const kmLongao = Math.round(kmTotal * 0.35);

  // Longão sempre presente (na base cresce aos poucos; 1 por semana).
  sessoes.push({
    tipo: 'longao',
    km: kmLongao,
    descricao: `Longão de ${kmLongao} km em ritmo conversacional`,
  });

  // Sessões de qualidade: nenhuma na base (só strides); 1-2 no build/pico; 1 curta no taper.
  let qualidade: SessaoCorridaPlanejada[] = [];
  if (!deload) {
    if (fase === 'build') {
      qualidade = [
        { tipo: 'tempo', km: Math.round(kmTotal * 0.15), descricao: 'Tempo run: 20-30min em ritmo de limiar' },
      ];
      if (dias >= 4) {
        qualidade.push({ tipo: 'intervalado', km: Math.round(kmTotal * 0.1), descricao: 'Intervalado: 5-6 × 800m forte, trote entre tiros' });
      }
    } else if (fase === 'pico') {
      qualidade = [
        { tipo: 'ritmo_prova', km: Math.round(kmTotal * 0.15), descricao: 'Treino em ritmo de prova' },
      ];
      if (dias >= 4) {
        qualidade.push({ tipo: 'intervalado', km: Math.round(kmTotal * 0.1), descricao: 'Intervalado: 4-5 × 1km em ritmo forte' });
      }
    } else if (fase === 'taper') {
      qualidade = [
        { tipo: 'intervalado', km: Math.round(kmTotal * 0.15), descricao: 'Tiros curtos: 6 × 400m — manter intensidade com volume baixo' },
      ];
    }
  }
  sessoes.push(...qualidade);

  // Restante do volume vira corridas fáceis (com strides 2×/sem na base).
  const kmRestante = Math.max(0, kmTotal - sessoes.reduce((s, x) => s + x.km, 0));
  const faceis = Math.max(1, dias - sessoes.length);
  const kmPorFacil = Math.max(2, Math.round(kmRestante / faceis));
  for (let i = 0; i < faceis; i++) {
    const comStrides = fase === 'base' && i < 2;
    sessoes.push({
      tipo: comStrides ? 'strides' : 'facil',
      km: kmPorFacil,
      descricao: comStrides
        ? `Fácil ${kmPorFacil} km + 6-8 × 100m de strides no final`
        : `Corrida fácil de ${kmPorFacil} km`,
    });
  }

  return sessoes;
}

/** Percentual de km "forte" da semana (para checar 80/20). */
export function percentualForte(semana: SemanaCorrida): number {
  const fortes: TipoCorrida[] = ['tempo', 'intervalado', 'ladeira', 'ritmo_prova', 'fartlek'];
  const kmForte = semana.sessoes.filter((s) => fortes.includes(s.tipo)).reduce((a, s) => a + s.km, 0);
  const total = semana.sessoes.reduce((a, s) => a + s.km, 0);
  return total > 0 ? kmForte / total : 0;
}

/** Valida as regras invioláveis do plano (spec seção 2). */
export function validarPlanoCorrida(plano: Pick<PlanoCorrida, 'semanas'>): string[] {
  const erros: string[] = [];
  const { semanas } = plano;

  for (let i = 1; i < semanas.length; i++) {
    const ant = semanas[i - 1];
    const cur = semanas[i];
    // aumento >10% só é aceitável saindo de deload de volta ao volume anterior
    if (!ant.deload && !cur.deload && cur.kmTotal > ant.kmTotal * 1.105) {
      erros.push(`Semana ${cur.numero}: aumento de volume acima de 10% (${ant.kmTotal} → ${cur.kmTotal} km).`);
    }
  }

  const temDeload = semanas.some((s) => s.deload);
  if (semanas.length >= 4 && !temDeload) {
    erros.push('Plano sem semana de recuo (deload) — inclua uma a cada 3-4 semanas.');
  }

  if (semanas[0]?.fase !== 'base') {
    erros.push('O plano precisa começar pela fase de base (2-4 semanas fáceis).');
  }

  for (const s of semanas) {
    const pf = percentualForte(s);
    if (pf > 0.3) {
      erros.push(`Semana ${s.numero}: ${Math.round(pf * 100)}% do volume é forte — acima da regra 80/20.`);
    }
    if (s.fase === 'base' && s.sessoes.some((x) => ['tempo', 'intervalado', 'ladeira', 'ritmo_prova'].includes(x.tipo))) {
      erros.push(`Semana ${s.numero} (base): não deve ter treino intervalado/tempo.`);
    }
  }

  return erros;
}

/** Aviso do widget de carga semanal: aumento de km >10% semana a semana. */
export function avisoAumentoCarga(kmSemanas: number[]): string | null {
  if (kmSemanas.length < 2) return null;
  const ant = kmSemanas[kmSemanas.length - 2];
  const cur = kmSemanas[kmSemanas.length - 1];
  if (ant > 0 && cur > ant * 1.1) {
    const pct = Math.round((cur / ant - 1) * 100);
    return `Atenção: volume de corrida subiu ${pct}% em relação à semana passada (limite recomendado: 10%).`;
  }
  return null;
}
