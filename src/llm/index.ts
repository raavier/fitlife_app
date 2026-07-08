// Camada de alto nível da LLM: lista de chaves com fallback automático +
// parse + validação + até 2 correções por chave.
import { getConfig, setConfig } from '../db/db';
import type { Ficha, LlmConfig, LlmKeyEntry, PlanoMensal } from '../db/types';
import { chamarLlm, extrairJson, LlmError } from './client';
import { comFallback } from './fallback';
import {
  MSG_CORRECAO,
  SYSTEM_CALISTENIA,
  SYSTEM_FICHA_ACADEMIA,
  SYSTEM_PLANO_MENSAL,
  SYSTEM_RELATORIO,
  userPromptCalistenia,
  userPromptFicha,
  userPromptPlanoMensal,
  userPromptRelatorio,
  type ParamsGeracaoFicha,
  type ParamsPlanoMensal,
} from './prompts';
import {
  validarFichaLlm,
  validarPlanoMensalLlm,
  validarRelatorioLlm,
  ValidacaoError,
  type RelatorioLlm,
} from './validate';

/**
 * Lista de chaves na ordem de prioridade. Migra automaticamente o formato
 * antigo (uma chave única em 'llm') na primeira leitura.
 */
export async function llmKeys(): Promise<LlmKeyEntry[]> {
  const lista = await getConfig<LlmKeyEntry[]>('llmKeys', []);
  if (lista.length > 0) return lista;
  const antiga = await getConfig<LlmConfig | null>('llm', null);
  if (antiga?.apiKey) {
    const migrada: LlmKeyEntry[] = [
      { id: crypto.randomUUID(), provider: antiga.provider, apiKey: antiga.apiKey, model: antiga.model ?? '' },
    ];
    await setConfig('llmKeys', migrada);
    return migrada;
  }
  return [];
}

export async function salvarLlmKeys(chaves: LlmKeyEntry[]): Promise<void> {
  await setConfig('llmKeys', chaves);
}

/**
 * Para UMA chave: chama, tenta parse+validação; em falha de formato,
 * re-chama anexando a mensagem de correção (máx. 2 correções — seção 5).
 * Erros de provedor (rate limit, chave inválida) sobem direto para o
 * fallback trocar de chave.
 */
async function gerarComCorrecao<T>(
  chave: LlmKeyEntry,
  system: string,
  userPrompt: string,
  validar: (json: unknown) => T,
): Promise<T> {
  const mensagens: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'user', content: userPrompt },
  ];

  let ultimoErro = '';
  for (let tentativa = 0; tentativa <= 2; tentativa++) {
    if (tentativa > 0) {
      mensagens.push({ role: 'user', content: MSG_CORRECAO(ultimoErro) });
    }
    const texto = await chamarLlm(chave, system, mensagens);
    mensagens.push({ role: 'assistant', content: texto });
    try {
      return validar(extrairJson(texto));
    } catch (e) {
      if (e instanceof ValidacaoError) ultimoErro = e.message;
      else if (e instanceof SyntaxError) ultimoErro = `JSON inválido: ${e.message}`;
      else throw e;
    }
  }
  throw new LlmError(`JSON inválido após 3 tentativas (${ultimoErro})`);
}

/** Executa a geração tentando cada chave configurada, na ordem. */
async function gerar<T>(
  system: string,
  userPrompt: string,
  validar: (json: unknown) => T,
): Promise<T> {
  const chaves = await llmKeys();
  return comFallback(chaves, (chave) => gerarComCorrecao(chave, system, userPrompt, validar));
}

export async function gerarFichaAcademia(
  params: ParamsGeracaoFicha,
): Promise<{ ficha: Omit<Ficha, 'id'>; avisos: string[] }> {
  return gerar(SYSTEM_FICHA_ACADEMIA, userPromptFicha(params), (json) =>
    validarFichaLlm(json, 'academia', params.equipamentos),
  );
}

export async function gerarTreinoCalistenia(
  params: ParamsGeracaoFicha,
): Promise<{ ficha: Omit<Ficha, 'id'>; avisos: string[] }> {
  return gerar(SYSTEM_CALISTENIA, userPromptCalistenia(params), (json) =>
    validarFichaLlm(json, 'calistenia', params.equipamentos),
  );
}

export async function gerarPlanoMensalLlm(
  params: ParamsPlanoMensal,
): Promise<Pick<PlanoMensal, 'inicio' | 'observacoes' | 'semanas'>> {
  return gerar(SYSTEM_PLANO_MENSAL, userPromptPlanoMensal(params), (json) =>
    validarPlanoMensalLlm(json, params.diasDisponiveis),
  );
}

export async function gerarResumoRelatorio(payload: Parameters<typeof userPromptRelatorio>[0]): Promise<RelatorioLlm> {
  return gerar(SYSTEM_RELATORIO, userPromptRelatorio(payload), validarRelatorioLlm);
}

export { LlmError } from './client';
