// Fallback entre múltiplas chaves/provedores: tenta na ordem da lista e,
// se uma chave falhar (rate limit, chave inválida, rede, JSON irrecuperável),
// passa para a próxima. Separado em função pura para ser testável.
import type { LlmKeyEntry } from '../db/types';
import { LlmError, NOME_PROVEDOR } from './client';

export async function comFallback<T>(
  chaves: LlmKeyEntry[],
  executar: (chave: LlmKeyEntry) => Promise<T>,
): Promise<T> {
  if (chaves.length === 0) {
    throw new LlmError(
      'Nenhuma chave de IA configurada. Adicione ao menos uma em Ajustes → IA (veja o tutorial de chaves grátis).',
    );
  }
  const falhas: string[] = [];
  for (const chave of chaves) {
    try {
      return await executar(chave);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      falhas.push(`${NOME_PROVEDOR[chave.provider]}${chave.model ? ` (${chave.model})` : ''}: ${msg}`);
    }
  }
  throw new LlmError(
    chaves.length === 1
      ? falhas[0]
      : `Todas as ${chaves.length} chaves falharam. ` + falhas.join(' | '),
  );
}
