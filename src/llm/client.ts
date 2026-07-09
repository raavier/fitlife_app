// Cliente LLM multi-provedor (free tiers): Gemini, Groq, OpenRouter.
// Sempre pede JSON mode; o parse/validação acontece em index.ts.
import type { LlmConfig, LlmProviderId } from '../db/types';

export const MODELOS_PADRAO: Record<LlmProviderId, string> = {
  gemini: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  cerebras: 'llama-3.3-70b',
  mistral: 'mistral-small-latest',
};

export const NOME_PROVEDOR: Record<LlmProviderId, string> = {
  gemini: 'Google Gemini',
  groq: 'Groq',
  openrouter: 'OpenRouter',
  cerebras: 'Cerebras',
  mistral: 'Mistral',
};

/** Endpoints OpenAI-compatíveis (todos menos o Gemini falam esse formato). */
const URL_OPENAI_COMPAT: Partial<Record<LlmProviderId, string>> = {
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  cerebras: 'https://api.cerebras.ai/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
};

export class LlmError extends Error {
  constructor(
    message: string,
    public readonly rateLimit = false,
  ) {
    super(message);
  }
}

interface Mensagem {
  role: 'user' | 'assistant';
  content: string;
}

/** Chamada bruta: retorna o texto da resposta do modelo. */
export async function chamarLlm(
  cfg: LlmConfig,
  system: string,
  mensagens: Mensagem[],
): Promise<string> {
  if (!cfg.apiKey) {
    throw new LlmError('Configure a chave da API da LLM em Ajustes antes de gerar.');
  }
  const model = cfg.model || MODELOS_PADRAO[cfg.provider];

  if (cfg.provider === 'gemini') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: mensagens.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
        }),
      },
    );
    if (!res.ok) throw await erroHttp(res);
    const data = await res.json();
    const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof texto !== 'string') throw new LlmError('Resposta vazia do Gemini.');
    return texto;
  }

  // Demais provedores falam o formato OpenAI-compatível.
  const url = URL_OPENAI_COMPAT[cfg.provider];
  if (!url) throw new LlmError(`Provedor desconhecido: ${cfg.provider}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, ...mensagens],
    }),
  });
  if (!res.ok) throw await erroHttp(res);
  const data = await res.json();
  const texto = data?.choices?.[0]?.message?.content;
  if (typeof texto !== 'string') throw new LlmError('Resposta vazia do provedor.');
  return texto;
}

async function erroHttp(res: Response): Promise<LlmError> {
  let detalhe = '';
  try {
    const body = await res.json();
    detalhe = body?.error?.message ?? JSON.stringify(body).slice(0, 200);
  } catch {
    detalhe = res.statusText;
  }
  if (res.status === 429) {
    return new LlmError(
      'Limite de uso do provedor atingido (rate limit). Aguarde um pouco e tente de novo.',
      true,
    );
  }
  if (res.status === 401 || res.status === 403) {
    return new LlmError('Chave da API inválida ou sem permissão. Verifique em Ajustes.');
  }
  // Erros típicos do OpenRouter em modelos :free
  if (res.status === 402) {
    return new LlmError(
      'O provedor pediu créditos (402). Confira se o modelo termina em ":free" (OpenRouter) — modelos pagos exigem saldo.',
    );
  }
  if (res.status === 404 && /data policy/i.test(detalhe)) {
    return new LlmError(
      'O OpenRouter bloqueou os modelos gratuitos pela sua configuração de privacidade. Em openrouter.ai → Settings → Privacy, ative "Enable free endpoints" / model training e tente de novo.',
    );
  }
  return new LlmError(`Erro do provedor (${res.status}): ${detalhe}`);
}

/** Extrai JSON do texto (tolerante a cercas de código que modelos free deixam vazar). */
export function extrairJson(texto: string): unknown {
  let t = texto.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  // fallback: recorta do primeiro { ao último }
  if (!t.startsWith('{')) {
    const ini = t.indexOf('{');
    const fim = t.lastIndexOf('}');
    if (ini >= 0 && fim > ini) t = t.slice(ini, fim + 1);
  }
  return JSON.parse(t);
}
