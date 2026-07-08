import { describe, it, expect } from 'vitest';
import { comFallback } from '../fallback';
import { LlmError } from '../client';
import type { LlmKeyEntry } from '../../db/types';

const chave = (id: string, provider: LlmKeyEntry['provider']): LlmKeyEntry => ({
  id,
  provider,
  apiKey: `key-${id}`,
  model: '',
});

describe('comFallback (várias chaves de API)', () => {
  it('usa a primeira chave quando ela funciona', async () => {
    const usadas: string[] = [];
    const r = await comFallback([chave('a', 'gemini'), chave('b', 'groq')], async (c) => {
      usadas.push(c.id);
      return 'ok-' + c.id;
    });
    expect(r).toBe('ok-a');
    expect(usadas).toEqual(['a']);
  });

  it('cai para a próxima chave quando a primeira falha (ex.: rate limit)', async () => {
    const usadas: string[] = [];
    const r = await comFallback(
      [chave('a', 'gemini'), chave('b', 'groq'), chave('c', 'openrouter')],
      async (c) => {
        usadas.push(c.id);
        if (c.id === 'a') throw new LlmError('Limite de uso atingido (rate limit).', true);
        if (c.id === 'b') throw new LlmError('Chave da API inválida.');
        return 'ok-' + c.id;
      },
    );
    expect(r).toBe('ok-c');
    expect(usadas).toEqual(['a', 'b', 'c']);
  });

  it('quando todas falham, agrega as mensagens por provedor', async () => {
    await expect(
      comFallback([chave('a', 'gemini'), chave('b', 'groq')], async (c) => {
        throw new LlmError(c.id === 'a' ? 'rate limit' : 'sem créditos');
      }),
    ).rejects.toThrow(/Todas as 2 chaves falharam.*Google Gemini: rate limit.*Groq: sem créditos/s);
  });

  it('sem chaves configuradas, orienta a ir em Ajustes', async () => {
    await expect(comFallback([], async () => 'x')).rejects.toThrow(/Nenhuma chave de IA configurada/);
  });

  it('com uma chave só, repassa a mensagem de erro original', async () => {
    await expect(
      comFallback([chave('a', 'gemini')], async () => {
        throw new LlmError('Chave da API inválida ou sem permissão.');
      }),
    ).rejects.toThrow(/^Google Gemini: Chave da API inválida/);
  });
});
