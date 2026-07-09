// Tutorial passo a passo: como conseguir a chave de API GRÁTIS de cada
// provedor suportado. Linkado a partir de Ajustes → IA.
import { Link } from 'react-router-dom';
import { Aviso, Secao } from '../components/ui';

interface Tutorial {
  emoji: string;
  nome: string;
  url: string;
  urlRotulo: string;
  prefixo: string;
  passos: string[];
  freeTier: string[];
  dica?: string;
}

const TUTORIAIS: Tutorial[] = [
  {
    emoji: '✨',
    nome: 'Google Gemini (AI Studio)',
    url: 'https://aistudio.google.com/apikey',
    urlRotulo: 'aistudio.google.com/apikey',
    prefixo: 'AIza…',
    passos: [
      'Acesse aistudio.google.com/apikey e entre com a sua conta Google (a mesma do Gmail serve).',
      'Aceite os termos de uso na primeira visita.',
      'Clique em "Create API key" / "Criar chave de API".',
      'Escolha "Create API key in new project" (não precisa entender de Google Cloud — ele cria tudo sozinho).',
      'Copie a chave exibida e cole no app em Ajustes → IA → Adicionar chave.',
    ],
    freeTier: [
      'Não pede cartão de crédito.',
      'O plano grátis dá um bom volume de chamadas por dia no modelo gemini-2.0-flash (limites por minuto e por dia).',
      'Se aparecer erro 429 (rate limit), espere um pouco — ou deixe o fallback do app pular para a próxima chave.',
    ],
    dica: 'É o mais generoso dos três — recomendo colocá-lo como primeira chave da lista.',
  },
  {
    emoji: '⚡',
    nome: 'Groq',
    url: 'https://console.groq.com/keys',
    urlRotulo: 'console.groq.com/keys',
    prefixo: 'gsk_…',
    passos: [
      'Acesse console.groq.com e crie uma conta (pode entrar com Google ou GitHub).',
      'No menu lateral, abra "API Keys".',
      'Clique em "Create API Key" e dê um nome qualquer (ex.: "fitlife").',
      'Copie a chave na hora — o Groq mostra a chave completa UMA única vez.',
      'Cole no app em Ajustes → IA → Adicionar chave.',
    ],
    freeTier: [
      'Não pede cartão de crédito.',
      'Roda modelos abertos (Llama 3.3 70B) com respostas muito rápidas.',
      'Tem limite de requisições por minuto e por dia no plano grátis.',
    ],
    dica: 'Ótima segunda opção: rápido e estável quando o Gemini atingir o limite.',
  },
  {
    emoji: '🚀',
    nome: 'Cerebras',
    url: 'https://cloud.cerebras.ai',
    urlRotulo: 'cloud.cerebras.ai',
    prefixo: 'csk-…',
    passos: [
      'Acesse cloud.cerebras.ai e crie a conta (Google ou e-mail). Sem cartão.',
      'No painel, abra "API Keys" → "Create API Key" e dê um nome.',
      'Copie a chave e cole no app em Ajustes → IA → Adicionar chave (provedor Cerebras).',
    ],
    freeTier: [
      'Free tier gigante: cerca de 1 milhão de tokens POR DIA (Llama 3.3 70B), ~30 requisições/minuto.',
      'Hardware próprio ultrarrápido — respostas quase instantâneas.',
      'Não pede cartão de crédito.',
    ],
    dica: 'Provavelmente o melhor custo-benefício da lista — ótima 1ª ou 2ª posição na fila.',
  },
  {
    emoji: '🌬️',
    nome: 'Mistral (La Plateforme)',
    url: 'https://console.mistral.ai',
    urlRotulo: 'console.mistral.ai',
    prefixo: '(chave alfanumérica)',
    passos: [
      'Acesse console.mistral.ai e crie a conta.',
      'Escolha o plano "Experiment" (o gratuito) — ele pede verificação por telefone e aceite de que os dados podem ser usados para treino.',
      'Abra "API Keys" → "Create new key" e copie a chave.',
      'Cole no app em Ajustes → IA → Adicionar chave (provedor Mistral).',
    ],
    freeTier: [
      'Cerca de 1 bilhão de tokens/mês no plano Experiment — de longe a maior cota mensal.',
      'Em troca, seus prompts podem ser usados para treinar os modelos deles (evite dados sensíveis).',
      'Sem cartão de crédito.',
    ],
    dica: 'A cota mensal enorme faz dele um excelente reserva para o fim da fila.',
  },
  {
    emoji: '🔀',
    nome: 'OpenRouter',
    url: 'https://openrouter.ai/settings/keys',
    urlRotulo: 'openrouter.ai/settings/keys',
    prefixo: 'sk-or-…',
    passos: [
      'Acesse openrouter.ai e clique em "Sign up" (pode usar Google ou GitHub).',
      'IMPORTANTE: em Settings → Privacy, ative a opção de usar endpoints gratuitos ("free endpoints" / model training) — sem isso os modelos :free são bloqueados.',
      'Abra o menu do perfil → "Keys" → "Create Key", dê um nome e deixe o limite de crédito em branco.',
      'Copie a chave e cole no app em Ajustes → IA → Adicionar chave.',
      'Use SOMENTE modelos com sufixo ":free" (o padrão do app já é um) — sem o sufixo o modelo é pago e dá erro de créditos.',
    ],
    freeTier: [
      'Grátis, mas o mais limitado dos cinco: 20 requisições/minuto e só 50 requisições/DIA.',
      'Se um dia você comprar US$10 de créditos (uma única vez, não expiram), o limite diário sobe para 1000 para sempre.',
      'Erro "requires more credits" (402) = modelo sem ":free" no nome ou saldo negativo.',
    ],
    dica: 'Deixe como última opção da fila — os outros quatro têm cotas bem maiores.',
  },
];

export default function TutorialChavesPage() {
  return (
    <div>
      <header className="mb-4">
        <h1 className="text-xl font-bold">Chaves de IA grátis — passo a passo</h1>
        <p className="text-sm text-slate-400">
          O app usa IA para gerar fichas, o plano do mês e o relatório. Cada provedor abaixo tem
          plano gratuito. Cadastre <strong>mais de uma</strong>: se uma atingir o limite do dia, o
          app pula automaticamente para a próxima da lista.
        </p>
      </header>

      <Aviso tipo="ok">
        Suas chaves ficam salvas <strong>somente neste dispositivo</strong> (IndexedDB) e as
        chamadas vão direto do seu navegador para o provedor. Nada passa por servidores do app.
      </Aviso>

      {TUTORIAIS.map((t) => (
        <Secao key={t.nome} titulo={`${t.emoji} ${t.nome}`}>
          <div className="card space-y-3 text-sm">
            <p>
              <a href={t.url} target="_blank" rel="noreferrer" className="font-semibold text-emerald-400 underline">
                {t.urlRotulo} ↗
              </a>
              <span className="ml-2 text-xs text-slate-500">(a chave começa com {t.prefixo})</span>
            </p>
            <ol className="list-inside list-decimal space-y-1.5 text-slate-300">
              {t.passos.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
            <div className="rounded-xl bg-slate-800/60 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                O que o plano grátis oferece
              </p>
              <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
                {t.freeTier.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
            {t.dica && <p className="text-xs text-sky-300">💡 {t.dica}</p>}
          </div>
        </Secao>
      ))}

      <Secao titulo="Como o fallback funciona">
        <div className="card space-y-2 text-sm text-slate-300">
          <p>
            Em <strong>Ajustes → IA</strong> você monta uma <strong>fila de chaves</strong> na ordem
            que preferir (pode inclusive ter duas chaves do mesmo provedor).
          </p>
          <p>
            Quando você gera algo, o app tenta a 1ª chave; se ela falhar — limite de tokens do dia
            esgotado, rate limit, chave inválida ou erro de rede — tenta a 2ª, depois a 3ª, e assim
            por diante. Você só vê erro se <em>todas</em> falharem (e a mensagem diz o motivo de cada
            uma).
          </p>
        </div>
      </Secao>

      <Link to="/ajustes" className="btn-primary w-full">
        Ir para Ajustes e cadastrar minhas chaves
      </Link>
    </div>
  );
}
