// Validações de cliente para o JSON da LLM (prompts_sistema_llm.md seção 6).
// Nunca confiar no JSON cru do modelo.
import { isMusculo, type Musculo, type Secundario } from '../domain';
import type { DiaPlano, ExercicioFicha, Ficha, PlanoMensal, SemanaPlano } from '../db/types';
import { diaSemanaDeIso } from '../lib/labels';

// Pesos default de ativação indireta quando a LLM devolve só a lista de códigos.
const PESO_SECUNDARIO_PADRAO = 0.4;

export class ValidacaoError extends Error {}

function exigir(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new ValidacaoError(msg);
}

const FAIXAS_DESCANSO: Record<string, { min: number; max: number }> = {
  forca: { min: 90, max: 330 },
  hipertrofia: { min: 45, max: 210 },
  resistencia: { min: 20, max: 90 },
  condicionamento: { min: 20, max: 75 },
  skills: { min: 60, max: 360 },
};

/**
 * Valida e converte o JSON da LLM em Ficha (academia ou calistenia).
 * Lança ValidacaoError com mensagem específica (vira o prompt de correção).
 * Retorna também avisos não bloqueantes (faixas de reps fora do objetivo).
 */
export function validarFichaLlm(
  json: unknown,
  modalidade: 'academia' | 'calistenia',
  equipamentosDisponiveis: string[],
): { ficha: Omit<Ficha, 'id'>; avisos: string[] } {
  const avisos: string[] = [];
  exigir(typeof json === 'object' && json !== null, 'A resposta não é um objeto JSON.');
  const f = json as Record<string, unknown>;

  exigir(typeof f.nome === 'string' && f.nome.length > 0, 'Campo "nome" ausente ou vazio.');
  exigir(
    ['forca', 'hipertrofia', 'resistencia', 'condicionamento', 'skills'].includes(String(f.objetivo)),
    `Campo "objetivo" inválido: ${String(f.objetivo)}.`,
  );
  exigir(Array.isArray(f.exercicios) && f.exercicios.length > 0, 'Lista "exercicios" vazia ou ausente.');

  const exercicios: ExercicioFicha[] = (f.exercicios as unknown[]).map((raw, i) => {
    exigir(typeof raw === 'object' && raw !== null, `Exercício ${i + 1} não é um objeto.`);
    const e = raw as Record<string, unknown>;
    const rotulo = `Exercício ${i + 1} (${String(e.nome ?? 'sem nome')})`;

    exigir(typeof e.nome === 'string' && e.nome.length > 0, `${rotulo}: campo "nome" ausente.`);
    exigir(typeof e.equipamento === 'string', `${rotulo}: campo "equipamento" ausente.`);
    exigir(
      equipamentosDisponiveis.includes(e.equipamento as string),
      `${rotulo}: equipamento "${String(e.equipamento)}" não está em equipamentos_disponiveis (${equipamentosDisponiveis.join(', ')}).`,
    );
    exigir(
      typeof e.musculo_primario === 'string' && isMusculo(e.musculo_primario),
      `${rotulo}: musculo_primario "${String(e.musculo_primario)}" fora do enum canônico.`,
    );

    const secundariosRaw = Array.isArray(e.musculos_secundarios) ? e.musculos_secundarios : [];
    const musculosSecundarios: Secundario[] = secundariosRaw.map((m) => {
      exigir(
        typeof m === 'string' && isMusculo(m),
        `${rotulo}: músculo secundário "${String(m)}" fora do enum canônico.`,
      );
      return { musculo: m as Musculo, peso: PESO_SECUNDARIO_PADRAO };
    });

    const series = Number(e.series);
    exigir(Number.isFinite(series) && series >= 1 && series <= 10, `${rotulo}: "series" inválido (${String(e.series)}).`);
    exigir(typeof e.reps === 'string' && (e.reps as string).length > 0, `${rotulo}: "reps" ausente.`);
    const descanso = Number(e.descanso_seg);
    exigir(Number.isFinite(descanso) && descanso > 0, `${rotulo}: "descanso_seg" inválido.`);

    // Faixas por objetivo: avisar (não bloquear), como manda a seção 6.
    const faixa = FAIXAS_DESCANSO[String(f.objetivo)];
    if (faixa && (descanso < faixa.min || descanso > faixa.max)) {
      avisos.push(`${rotulo}: descanso de ${descanso}s fora da faixa típica do objetivo.`);
    }

    if (modalidade === 'calistenia' && !e.progressao_atual) {
      avisos.push(`${rotulo}: sem "progressao_atual" — preencha na revisão.`);
    }

    return {
      nome: e.nome as string,
      equipamento: e.equipamento as string,
      musculoPrimario: e.musculo_primario as Musculo,
      musculosSecundarios,
      series,
      reps: e.reps as string,
      descansoSeg: descanso,
      progressaoAtual: (e.progressao_atual as string | null) ?? null,
      proximaProgressao: (e.proxima_progressao as string | null) ?? null,
      observacao: typeof e.observacao === 'string' ? e.observacao : undefined,
    };
  });

  return {
    ficha: {
      nome: f.nome as string,
      modalidade,
      objetivo: f.objetivo as Ficha['objetivo'],
      divisao: typeof f.divisao === 'string' ? f.divisao : undefined,
      duracaoEstimadaMin: Number.isFinite(Number(f.duracao_estimada_min))
        ? Number(f.duracao_estimada_min)
        : undefined,
      exercicios,
      origem: 'ia',
      criadoEm: Date.now(),
    },
    avisos,
  };
}

const MODALIDADES_PLANO = ['corrida', 'academia', 'calistenia', 'descanso'];

/** Valida o SCHEMA do plano mensal vindo da LLM (regras de domínio ficam em lib/planoMensal). */
export function validarPlanoMensalLlm(
  json: unknown,
  diasDisponiveis: string[],
): Pick<PlanoMensal, 'inicio' | 'observacoes' | 'semanas'> {
  exigir(typeof json === 'object' && json !== null, 'A resposta não é um objeto JSON.');
  const p = json as Record<string, unknown>;
  exigir(
    typeof p.inicio === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.inicio),
    'Campo "inicio" ausente ou fora do formato YYYY-MM-DD.',
  );
  exigir(Array.isArray(p.semanas) && p.semanas.length >= 4, 'São necessárias 4 semanas em "semanas".');

  const semanas: SemanaPlano[] = (p.semanas as unknown[]).slice(0, 5).map((raw, i) => {
    exigir(typeof raw === 'object' && raw !== null, `Semana ${i + 1} não é um objeto.`);
    const s = raw as Record<string, unknown>;
    exigir(Array.isArray(s.dias) && s.dias.length > 0, `Semana ${i + 1}: lista "dias" vazia.`);
    const dias: DiaPlano[] = (s.dias as unknown[]).map((rd, j) => {
      exigir(typeof rd === 'object' && rd !== null, `Semana ${i + 1}, dia ${j + 1}: não é objeto.`);
      const d = rd as Record<string, unknown>;
      exigir(
        typeof d.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.data),
        `Semana ${i + 1}, dia ${j + 1}: "data" inválida (${String(d.data)}).`,
      );
      exigir(
        MODALIDADES_PLANO.includes(String(d.modalidade)),
        `Dia ${String(d.data)}: modalidade "${String(d.modalidade)}" inválida (use corrida|academia|calistenia|descanso).`,
      );
      const modalidade = d.modalidade as DiaPlano['modalidade'];
      exigir(
        modalidade === 'descanso' || diasDisponiveis.includes(diaSemanaDeIso(d.data as string)),
        `Dia ${String(d.data)}: sessão agendada em dia indisponível (disponíveis: ${diasDisponiveis.join(', ')}).`,
      );
      return {
        data: d.data as string,
        modalidade,
        foco: typeof d.foco === 'string' ? d.foco : null,
      };
    });
    return { numero: Number(s.numero) || i + 1, deload: !!s.deload, dias };
  });

  exigir(
    semanas.some((s) => s.deload),
    'Nenhuma semana marcada como deload — marque UMA semana do mês como deload.',
  );

  return {
    inicio: p.inicio as string,
    observacoes: typeof p.observacoes === 'string' ? p.observacoes : undefined,
    semanas,
  };
}

export interface RelatorioLlm {
  resumo: string;
  pontos_fortes: string[];
  pontos_atencao: string[];
  sugestoes_proximo_ciclo: string[];
  grupos_fora_do_alvo: { grupo: string; status: 'abaixo' | 'acima'; series_semana_media: number }[];
}

export function validarRelatorioLlm(json: unknown): RelatorioLlm {
  exigir(typeof json === 'object' && json !== null, 'A resposta não é um objeto JSON.');
  const r = json as Record<string, unknown>;
  exigir(typeof r.resumo === 'string' && r.resumo.length > 0, 'Campo "resumo" ausente.');
  const arr = (k: string): string[] =>
    Array.isArray(r[k]) ? (r[k] as unknown[]).map(String) : [];
  const grupos = Array.isArray(r.grupos_fora_do_alvo)
    ? (r.grupos_fora_do_alvo as Record<string, unknown>[])
        .filter((g) => typeof g?.grupo === 'string' && isMusculo(g.grupo as string))
        .map((g) => ({
          grupo: g.grupo as string,
          status: (g.status === 'acima' ? 'acima' : 'abaixo') as 'abaixo' | 'acima',
          series_semana_media: Number(g.series_semana_media) || 0,
        }))
    : [];
  return {
    resumo: r.resumo as string,
    pontos_fortes: arr('pontos_fortes'),
    pontos_atencao: arr('pontos_atencao'),
    sugestoes_proximo_ciclo: arr('sugestoes_proximo_ciclo'),
    grupos_fora_do_alvo: grupos,
  };
}
