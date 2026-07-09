// Snapshot do atleta para os geradores de IA: estado de recuperação, volume
// da semana vs alvo e último treino do mesmo tipo. Os NÚMEROS são calculados
// pelo domain/ a partir dos logs reais — a LLM só recebe o resultado pronto
// (nunca inventa), seguindo a filosofia do projeto.
import {
  alvoVolume,
  MUSCULOS,
  recuperacaoDoMusculo,
  statusVolume,
  volumeSemanalPorMusculo,
  type Musculo,
  type Nivel,
  type RecuperacaoMusculo,
} from '../domain';
import { db, getConfig } from '../db/db';
import type { Ficha, LogTreino } from '../db/types';
import { logsParaEstimulos } from './estimulos';
import { semanaAtual } from '../hooks/useAppData';

const DIA_MS = 24 * 3600 * 1000;

export interface SnapshotAtleta {
  nivel: Nivel;
  recuperacoes: Partial<Record<Musculo, RecuperacaoMusculo>>;
  volume: Partial<Record<Musculo, number>>;
}

export async function snapshotAtleta(): Promise<SnapshotAtleta> {
  const [logs, custom, nivel] = await Promise.all([
    db.logs.toArray(),
    db.esportesCustom.toArray(),
    getConfig<Nivel>('nivel', 'intermediario'),
  ]);
  const estimulos = logsParaEstimulos(logs, custom);
  const agora = Date.now();
  const recuperacoes: Partial<Record<Musculo, RecuperacaoMusculo>> = {};
  for (const m of MUSCULOS) recuperacoes[m] = recuperacaoDoMusculo(m, estimulos, agora);
  const { inicio, fim } = semanaAtual();
  return { nivel, recuperacoes, volume: volumeSemanalPorMusculo(estimulos, inicio, fim) };
}

/** Formata o snapshot como bloco de texto do prompt (usa os códigos do enum). */
export function formatarSnapshot(s: SnapshotAtleta): string {
  const fadigados: string[] = [];
  const recuperando: string[] = [];
  for (const m of MUSCULOS) {
    const r = s.recuperacoes[m];
    if (!r) continue;
    if (r.status === 'fadigado') fadigados.push(`${m} (libera em ~${r.horasAteLiberar}h)`);
    else if (r.status === 'recuperando') recuperando.push(`${m} (~${r.horasAteLiberar}h)`);
  }
  const alvo = alvoVolume(s.nivel);
  const volume = (Object.entries(s.volume) as [Musculo, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([m, v]) => `${m} ${v} (${statusVolume(v, s.nivel)})`);

  return [
    `musculos_fadigados_agora: ${fadigados.length ? fadigados.join(', ') : 'nenhum'}`,
    `musculos_recuperando: ${recuperando.length ? recuperando.join(', ') : 'nenhum'}`,
    `volume_series_desta_semana_vs_alvo_${alvo.min}-${alvo.max}: ${volume.length ? volume.join(', ') : 'sem treinos ainda nesta semana'}`,
  ].join('\n');
}

/** Resume o último treino CONCLUÍDO da modalidade (o que foi feito de verdade). */
export function formatarUltimoTreino(log: LogTreino | undefined, agora = Date.now()): string {
  if (!log?.exercicios?.length) return 'ultimo_treino_deste_tipo: nenhum registrado';
  const dias = Math.round((agora - log.timestamp) / DIA_MS);
  const itens = log.exercicios.map((ex) => {
    const feitas = ex.seriesFeitas.length;
    const melhorCarga = Math.max(0, ...ex.seriesFeitas.map((sf) => sf.carga ?? 0));
    const partes = [`${feitas}x${ex.reps}`];
    if (melhorCarga > 0) partes.push(`${melhorCarga}kg`);
    if (ex.progressaoAtual) partes.push(`variação: ${ex.progressaoAtual}`);
    return `${ex.nome} [${partes.join(', ')}]`;
  });
  return `ultimo_treino_deste_tipo (há ${dias} dia(s), RPE ${log.rpe}${log.qualidade ? `, qualidade ${log.qualidade}` : ''}): ${itens.join('; ')}`;
}

const INSTRUCOES_CONTEXTO = `REGRAS SOBRE O CONTEXTO ACIMA (obrigatórias):
- EVITE prescrever volume pesado para os musculos_fadigados_agora; se o foco pedido os exigir, reduza séries/intensidade e diga o porquê na observacao.
- Priorize grupos com volume "abaixo" do alvo, desde que coerente com o foco/divisão pedidos.
- Se houver ultimo_treino_deste_tipo, PROGRIDA em relação a ele (próxima variação na calistenia, +carga/+reps na academia). NÃO repita o treino igual.`;

/** Contexto completo para o gerador de ficha (academia ou calistenia). */
export async function contextoParaFicha(
  modalidade: 'academia' | 'calistenia',
): Promise<{ texto: string; recuperacoes: Partial<Record<Musculo, RecuperacaoMusculo>> }> {
  const snap = await snapshotAtleta();
  const ultimo = await db.logs
    .where('modalidade')
    .equals(modalidade)
    .filter((l) => l.status === 'feito' && !!l.exercicios?.length)
    .last();
  const texto = [
    'CONTEXTO ATUAL DO ATLETA (calculado pelo app a partir dos treinos reais):',
    formatarSnapshot(snap),
    formatarUltimoTreino(ultimo),
    INSTRUCOES_CONTEXTO,
  ].join('\n');
  return { texto, recuperacoes: snap.recuperacoes };
}

/** Contexto para o planejador mensal: recuperação de partida + base de corrida. */
export async function contextoParaPlanoMensal(): Promise<string> {
  const snap = await snapshotAtleta();
  const agora = Date.now();
  const corridas = await db.logs
    .where('modalidade')
    .equals('corrida')
    .filter((l) => l.status === 'feito' && !!l.corrida && l.timestamp > agora - 28 * DIA_MS)
    .toArray();
  const kmSemanas: number[] = [];
  for (let w = 3; w >= 0; w--) {
    const fim = agora - w * 7 * DIA_MS;
    const ini = fim - 7 * DIA_MS;
    const km = corridas
      .filter((l) => l.timestamp >= ini && l.timestamp < fim)
      .reduce((s, l) => s + (l.corrida?.distanciaKm ?? 0), 0);
    kmSemanas.push(Math.round(km * 10) / 10);
  }
  return [
    'CONTEXTO ATUAL DO ATLETA (calculado pelo app a partir dos treinos reais):',
    formatarSnapshot(snap),
    `km_de_corrida_nas_ultimas_4_semanas: [${kmSemanas.join(', ')}]`,
    `REGRAS SOBRE O CONTEXTO ACIMA (obrigatórias):
- Comece a 1a semana LEVE para os musculos_fadigados_agora (nada pesado desses grupos nas primeiras 48-72h).
- Use km_de_corrida_nas_ultimas_4_semanas como base do volume de corrida da 1a semana (aumento máximo de 10% sobre a média recente; se tudo for 0, comece conservador).`,
  ].join('\n');
}

/** Avisos pós-geração: a ficha bate em músculo fadigado AGORA? (não bloqueia) */
export function avisosFichaVsRecuperacao(
  ficha: Pick<Ficha, 'exercicios'>,
  recuperacoes: Partial<Record<Musculo, RecuperacaoMusculo>>,
): string[] {
  const avisados = new Set<Musculo>();
  const avisos: string[] = [];
  for (const ex of ficha.exercicios) {
    const r = recuperacoes[ex.musculoPrimario];
    if (r?.status === 'fadigado' && !avisados.has(ex.musculoPrimario)) {
      avisados.add(ex.musculoPrimario);
      avisos.push(
        `"${ex.nome}" trabalha ${ex.musculoPrimario}, que está FADIGADO agora (libera em ~${r.horasAteLiberar}h). Considere treinar mais tarde ou trocar o exercício.`,
      );
    }
  }
  return avisos;
}
