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

| Provedor | Onde pegar a chave | Modelo padrão |
| --- | --- | --- |
| Google Gemini | [aistudio.google.com](https://aistudio.google.com) | `gemini-2.0-flash` |
| Groq | [console.groq.com](https://console.groq.com) | `llama-3.3-70b-versatile` |
| OpenRouter | [openrouter.ai](https://openrouter.ai) | `meta-llama/llama-3.3-70b-instruct:free` |

Você pode cadastrar **várias chaves** (inclusive de provedores diferentes) numa **fila de fallback**: o app tenta na ordem e, se uma chave falhar — limite de tokens do dia esgotado, rate limit, chave inválida ou erro de rede — passa automaticamente para a próxima. Só dá erro se todas falharem, e a mensagem informa o motivo de cada uma.

O próprio app tem um **tutorial passo a passo** de como criar a chave grátis de cada provedor: **Ajustes → IA → "Como conseguir grátis?"** (rota `/ajustes/tutorial-chaves`).

As chaves ficam salvas **somente no seu dispositivo** (IndexedDB) e as chamadas vão direto do navegador para o provedor. A interface (`src/llm/client.ts`) abstrai os três formatos de API; o fallback vive em `src/llm/fallback.ts`. Toda resposta é pedida em JSON mode e **validada no cliente** (schema + enum canônico de músculos + equipamentos disponíveis) com até 2 tentativas de correção por chave; se falhar, o app orienta a edição manual.

## Arquitetura

```
src/
  domain/       ← núcleo puro (tipos, volume, recuperação, estímulos) + testes. NÃO reescrever.
  db/           ← persistência local (Dexie/IndexedDB) sobre os tipos do domínio
  data/         ← catálogos semente: equipamentos (academia/calistenia) e exercícios com progressões
  lib/          ← regras do app: corrida periodizada, validação do plano mensal, agregação do relatório,
                  conversão logs → estímulos (corrida e esportes também alimentam o heatmap)
  llm/          ← prompts de sistema, cliente multi-provedor, validação do JSON
  components/   ← BodyMap (heatmap SVG frente/costas), timer de descanso, UI
  pages/        ← telas (Hoje, Treinos, Plano, Corrida, Registros, Histórico, Relatório, Ajustes)
```

Princípios (ver `CLAUDE.md`):

- O **enum canônico de músculos** em `domain/types.ts` é o contrato entre prompts → JSON da LLM → validação → heatmap.
- Tudo que gera carga vira `Estimulo` do domínio — por isso futebol e corrida contam no heatmap sem código especial.
- A LLM só gera *sugestões estruturadas*; os números (volume, fadiga, adesão) são calculados localmente pelo `domain/`.
- Domínio permanece puro: sem React, sem storage, sem rede.
