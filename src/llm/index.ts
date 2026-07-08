// Camada de alto nível da LLM: chamada + parse + validação + até 2 correções.
import { getConfig } from '../db/db';
import type { Ficha, LlmConfig, PlanoMensal } from '../db/types';
import { chamarLlm, extrairJson, LlmError } from './client';
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

export async function llmConfigAtual(): Promise<LlmConfig> {
  return getConfig<LlmConfig>('llm', { provider: 'gemini', apiKey: '', model: '' });
}

/**
 * Fluxo de correção da seção 5: chama, tenta parse+validação; em falha,
 * re-chama anexando a mensagem de correção. Máximo 2 correções.
 */
async function gerarComCorrecao<T>(
  system: string,
  userPrompt: string,
  validar: (json: unknown) => T,
): Promise<T> {
  const cfg = await llmConfigAtual();
  const mensagens: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'user', content: userPrompt },
  ];

  let ultimoErro = '';
  for (let tentativa = 0; tentativa <= 2; tentativa++) {
    if (tentativa > 0) {
      mensagens.push({ role: 'user', content: MSG_CORRECAO(ultimoErro) });
    }
    const texto = await chamarLlm(cfg, system, mensagens);
    mensagens.push({ role: 'assistant', content: texto });
    try {
      return validar(extrairJson(texto));
    } catch (e) {
      if (e instanceof ValidacaoError) ultimoErro = e.message;
      else if (e instanceof SyntaxError) ultimoErro = `JSON inválido: ${e.message}`;
      else throw e;
    }
  }
  throw new LlmError(
    `A LLM não devolveu um JSON válido após 3 tentativas (${ultimoErro}). Você pode criar/editar manualmente.`,
  );
}

export async function gerarFichaAcademia(
  params: ParamsGeracaoFicha,
): Promise<{ ficha: Omit<Ficha, 'id'>; avisos: string[] }> {
  return gerarComCorrecao(SYSTEM_FICHA_ACADEMIA, userPromptFicha(params), (json) =>
    validarFichaLlm(json, 'academia', params.equipamentos),
  );
}

export async function gerarTreinoCalistenia(
  params: ParamsGeracaoFicha,
): Promise<{ ficha: Omit<Ficha, 'id'>; avisos: string[] }> {
  return gerarComCorrecao(SYSTEM_CALISTENIA, userPromptCalistenia(params), (json) =>
    validarFichaLlm(json, 'calistenia', params.equipamentos),
  );
}

export async function gerarPlanoMensalLlm(
  params: ParamsPlanoMensal,
): Promise<Pick<PlanoMensal, 'inicio' | 'observacoes' | 'semanas'>> {
  return gerarComCorrecao(SYSTEM_PLANO_MENSAL, userPromptPlanoMensal(params), (json) =>
    validarPlanoMensalLlm(json, params.diasDisponiveis),
  );
}

export async function gerarResumoRelatorio(payload: Parameters<typeof userPromptRelatorio>[0]): Promise<RelatorioLlm> {
  return gerarComCorrecao(SYSTEM_RELATORIO, userPromptRelatorio(payload), validarRelatorioLlm);
}

export { LlmError } from './client';
