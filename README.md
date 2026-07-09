# FitLife — corrida + academia + calistenia

PWA pessoal (mobile-first, PT-BR, offline-first) que unifica três modalidades de treino com dois diferenciais:

1. **Mapa de recuperação muscular (heatmap)** que enxerga corrida, academia, calistenia e atividades extras (futebol, tênis…) juntas e evita sobrecarga.
2. **Planejador mensal** que monta o mês a partir da frequência semanal desejada de cada modalidade e gera um relatório de fechamento com índices de qualidade.

## Rodando

```bash
npm install
npm run dev        # desenvolvimento
npm test           # testes (domínio + regras de corrida/plano/estímulos)
npm run build      # build de produção (gera PWA com service worker)
npm run preview    # serve o build
```

O app é instalável como PWA (manifest + service worker via `vite-plugin-pwa`) e funciona offline — todos os dados ficam no IndexedDB do dispositivo (Dexie).

## Configurando a LLM (geração de fichas, plano mensal e relatório)

A geração por IA usa provedores de **free tier**, configuráveis dentro do app em **Ajustes → IA**:

| Provedor | Onde pegar a chave | Modelo padrão | Free tier (jul/2026) |
| --- | --- | --- | --- |
| Google Gemini | [aistudio.google.com](https://aistudio.google.com) | `gemini-2.0-flash` | cota diária generosa |
| Groq | [console.groq.com](https://console.groq.com) | `llama-3.3-70b-versatile` | limites por minuto/dia |
| Cerebras | [cloud.cerebras.ai](https://cloud.cerebras.ai) | `llama-3.3-70b` | ~1M tokens/dia |
| Mistral | [console.mistral.ai](https://console.mistral.ai) | `mistral-small-latest` | ~1B tokens/mês (Experiment, opt-in de treino) |
| OpenRouter | [openrouter.ai](https://openrouter.ai) | `meta-llama/llama-3.3-70b-instruct:free` | 50 req/dia (1000 após compra única de US$10); exige ativar free endpoints na privacidade |

Você pode cadastrar **várias chaves** (inclusive de provedores diferentes) numa **fila de fallback**: o app tenta na ordem e, se uma chave falhar — limite de tokens do dia esgotado, rate limit, chave inválida ou erro de rede — passa automaticamente para a próxima. Só dá erro se todas falharem, e a mensagem informa o motivo de cada uma.

O próprio app tem um **tutorial passo a passo** de como criar a chave grátis de cada provedor: **Ajustes → IA → "Como conseguir grátis?"** (rota `/ajustes/tutorial-chaves`).

As chaves ficam salvas **somente no seu dispositivo** (IndexedDB) e as chamadas vão direto do navegador para o provedor. A interface (`src/llm/client.ts`) abstrai os três formatos de API; o fallback vive em `src/llm/fallback.ts`. Toda resposta é pedida em JSON mode e **validada no cliente** (schema + enum canônico de músculos + equipamentos disponíveis) com até 2 tentativas de correção por chave; se falhar, o app orienta a edição manual.

## Hospedagem grátis (GitHub Pages)

O app é 100% estático — não precisa de servidor. O deploy no **GitHub Pages** já está automatizado em [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): a cada push na branch `master`, o workflow roda os testes, faz o build e publica.

**Para ativar (uma vez só):**

1. No GitHub, abra **Settings → Pages** do repositório e em *Build and deployment* → *Source* escolha **GitHub Actions**.
2. Faça merge desta branch na `master` (ou rode o workflow manualmente em *Actions → Deploy no GitHub Pages → Run workflow*).
3. O app fica no ar em `https://<seu-usuario>.github.io/fitlife_app/` — instalável como PWA direto do navegador do celular.

O build do Pages usa `BASE_PATH=/fitlife_app/` (o workflow deduz do nome do repositório); localmente nada muda (`npm run dev` continua em `/`).

**Se for usar o login/sync:** depois de publicado, adicione a URL do Pages no seu projeto Supabase em **Authentication → URL Configuration** (Site URL e Redirect URLs) — senão o link mágico e o Google redirecionam para o endereço errado.

**Alternativas** igualmente grátis, se preferir domínio mais limpo: Netlify, Vercel ou Cloudflare Pages — em todos, basta apontar para o repo com build `npm run build` e diretório `dist` (sem `BASE_PATH`, pois servem na raiz).

## Login e sincronização entre dispositivos (opcional, via Supabase)

O app continua **offline-first**: tudo funciona sem conta e sem internet, com os dados no IndexedDB. Com login (link mágico por e-mail ou Google), os dados sincronizam com a nuvem para backup e uso em vários aparelhos.

**Para o usuário final não há configuração nenhuma:** o app publicado já vem conectado ao projeto Supabase do dono (constantes em `src/sync/supabaseClient.ts`) — a aba Conta mostra direto o login. Quem fizer **fork** do projeto troca essas constantes pelas do próprio projeto (ou define `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` no build, que têm prioridade), seguindo os passos:

1. Crie um projeto grátis em [supabase.com](https://supabase.com).
2. No **SQL Editor** do projeto, rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) — cria a tabela `sync_registros` com RLS (cada usuário só acessa as próprias linhas).
3. Para "Entrar com Google", ative o provedor Google em **Authentication → Sign In / Up** (o login por e-mail com link mágico já vem ativo).
4. No app, abra **Ajustes → Conta e sincronização** e cole a *Project URL* e a *anon public key* (Settings → API) — ou configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no build.

O login é **sem senha**: link mágico por e-mail ou conta Google (OAuth/PKCE). A sync roda automaticamente ao logar, ao voltar a rede e após alterações locais (debounce), com resolução de conflitos *last-write-wins* e propagação de exclusões por lápides. As chaves de IA **não** são sincronizadas — ficam em cada dispositivo.

## Mapa de recuperação 2D e 3D

O painel de recuperação tem duas visões (toggle na tela inicial):

- **2D** — silhueta SVG frente/costas, leve e instantânea.
- **3D** — boneco em three.js que você **gira com o dedo** (OrbitControls), com zoom por pinça e seleção de músculo por toque (raycasting). O three.js é carregado sob demanda (lazy chunk), então quem fica no 2D não baixa nada a mais.

## Arquitetura

```
src/
  domain/       ← núcleo puro (tipos, volume, recuperação, estímulos) + testes. NÃO reescrever.
  db/           ← persistência local (Dexie/IndexedDB) sobre os tipos do domínio
  data/         ← catálogos semente: equipamentos (academia/calistenia) e exercícios com progressões
  lib/          ← regras do app: corrida periodizada, validação do plano mensal, agregação do relatório,
                  conversão logs → estímulos (corrida e esportes também alimentam o heatmap)
  llm/          ← prompts de sistema, cliente multi-provedor + fallback, validação do JSON
  sync/         ← cliente Supabase opcional + motor de sincronização offline-first
  components/   ← BodyMap (SVG 2D), BodyMap3D (three.js), timer de descanso, UI
  pages/        ← telas (Hoje, Treinos, Plano, Corrida, Registros, Histórico, Relatório, Ajustes)
```

Princípios (ver `CLAUDE.md`):

- O **enum canônico de músculos** em `domain/types.ts` é o contrato entre prompts → JSON da LLM → validação → heatmap.
- Tudo que gera carga vira `Estimulo` do domínio — por isso futebol e corrida contam no heatmap sem código especial.
- A LLM só gera *sugestões estruturadas*; os números (volume, fadiga, adesão) são calculados localmente pelo `domain/`.
- Domínio permanece puro: sem React, sem storage, sem rede.
