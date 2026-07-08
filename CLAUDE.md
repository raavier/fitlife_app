# Ponto de partida — App fitness (corrida + academia + calistenia)

> Este é o arquivo-base do projeto. Leia-o primeiro. Ele indexa os outros documentos, diz **quando usar cada um** e define a ordem de trabalho. Sugestão: renomeie para `CLAUDE.md` na raiz do repositório para que eu (Claude Code) o carregue automaticamente.

---

## 1. O que estamos construindo

Um app pessoal (PWA mobile-first, PT-BR, offline-first) que unifica **três modalidades de treino** — corrida, academia (musculação) e calistenia — com dois diferenciais:

1. **Mapa de recuperação muscular (heatmap)** que enxerga as três modalidades + atividades extras (futebol, tênis…) juntas e evita sobrecarga.
2. **Planejador mensal** que monta o mês a partir da frequência semanal desejada de cada modalidade e, ao fim, gera um relatório com índices de qualidade.

A geração de fichas/treinos/planos usa uma **LLM de free tier** (Gemini/Groq/OpenRouter), sempre com saída JSON validada.

---

## 2. Arquivos do projeto e quando usar cada um

### `prompt_app_fitness.md` — a ESPECIFICAÇÃO do produto
O documento mestre. Descreve todos os módulos (corrida, academia, calistenia, planejador mensal, registro/troca/atividades extras, painel de recuperação, relatório), o modelo de dados, a stack e os catálogos semente (equipamentos de academia e de calistenia, esportes).
**Quando usar:** é a fonte de verdade de *o que* construir. Consulte a seção correspondente antes de implementar qualquer tela ou módulo. As seções **8 (Regras de domínio)** e **11 (Dados semente)** são obrigatórias — não improvise em cima delas.

### `prompts_sistema_llm.md` — os PROMPTS das chamadas de IA
Contém os quatro system prompts prontos (gerador de ficha de academia, gerador de calistenia, planejador mensal, relatório), os templates de user prompt com placeholders `{{}}`, o fluxo de correção de JSON e as validações de cliente.
**Quando usar:** ao implementar a camada de LLM (`llm/`). Cole cada system prompt na função correspondente. Respeite o **enum canônico de músculos** definido no topo desse arquivo — ele é o mesmo do domínio e do heatmap; se divergir, a agregação quebra.

### `fittrack-domain.tar.gz` — o NÚCLEO de lógica, JÁ PRONTO E TESTADO
Módulo `domain/` em TypeScript puro (sem UI/storage) + testes Vitest (21 testes passando). Contém:
- `types.ts` — tipos + enum canônico de músculos.
- `muscleData.ts` — janelas de recuperação por músculo, mapa de esportes, alvos de volume.
- `stimulus.ts` — converte exercícios e atividades extras em "estímulos" (aplica ativação indireta).
- `volume.ts` — volume semanal por músculo (direto + indireto) e status vs alvo (10–20 / 6–10).
- `recovery.ts` — fadiga por músculo, status verde/amarelo/vermelho e horas até liberar.
- `index.ts` — barrel de exports.
- `__tests__/volume.test.ts`, `__tests__/recovery.test.ts` — os testes.
- `README.md`, `package.json`.

**Quando usar:** é a base sobre a qual tudo é construído. **Não reescreva** essa lógica — extraia, rode os testes e consuma as funções. O heatmap consome `recuperacaoDoMusculo`; o painel de volume consome `volumeSemanalPorMusculo`; o relatório usa os dois.

---

## 3. Como começar (passo a passo)

1. **Extraia o núcleo:** descompacte `fittrack-domain.tar.gz` e copie `src/domain/` para dentro do app. Instale deps e rode `npm test` — confirme os 21 testes verdes ANTES de qualquer outra coisa. Se não passarem, corrija o ambiente, não a lógica.
2. **Leia a spec:** abra `prompt_app_fitness.md` e monte o esqueleto da stack (seção 0) e o modelo de dados (seção 12) em cima dos tipos que já existem em `domain/types.ts` (reutilize o enum de músculos e as interfaces; não crie enums paralelos).
3. **Construa de dentro pra fora**, na ordem da seção 6 abaixo.
4. **Camada de IA por último por módulo:** ao chegar num gerador, use os prompts de `prompts_sistema_llm.md` e implemente a validação de cliente (seção 6 daquele arquivo) — nunca confie no JSON cru do modelo.

---

## 4. Como as peças se conectam

- Tudo que gera carga muscular (exercício de academia, de calistenia, corrida, atividade extra) é convertido para o tipo `Estimulo` do `domain/`. **Volume e recuperação consomem a mesma representação** — então corrida e futebol já contam no heatmap sem código especial.
- A LLM só gera *sugestões estruturadas* (fichas, plano, texto do relatório). A **inteligência de verdade está no `domain/`**: os números (volume real, fadiga por músculo, adesão) são calculados localmente e passados como payload para a LLM, não inventados por ela.
- O **enum de músculos** é o contrato que amarra os três documentos: prompts → JSON da LLM → validação → `domain/` → heatmap. Ele aparece idêntico em `domain/types.ts` e no topo de `prompts_sistema_llm.md`.

---

## 5. Regras invioláveis

- **Não reescrever o `domain/`.** Estender é ok (novos esportes em `SPORT_MAP`, novos exercícios no catálogo); reimplementar não.
- **Domínio permanece puro:** sem React, sem storage, sem chamadas de rede dentro de `domain/`. Facilita testar e trocar de UI.
- **UI em PT-BR, offline-first, instalável (PWA).**
- **Todo JSON de LLM é validado** contra schema + enum de músculos + equipamentos disponíveis antes de usar. Até 2 tentativas de correção; depois, edição manual.
- **Respeitar as regras de recuperação** (seção 8 da spec) no planejador: não empilhar leg day pesado + corrida dura em <24h; 80/20 na corrida; uma semana de deload por mês.
- Sempre que adicionar lógica de domínio nova, **adicione teste** no mesmo padrão dos existentes.

---

## 6. Ordem de construção sugerida

1. Núcleo `domain/` extraído e testes verdes (feito — só integrar).
2. Modelo de dados + persistência local (IndexedDB/Dexie) sobre os tipos do domínio.
3. Catálogos semente populados (equipamentos academia + calistenia, exercícios com mapeamento muscular e progressões, esportes) — spec seções 11 e 8.3/8.5.
4. Registro de treino + índice de qualidade + timer (spec seção 6) — feeds do domínio.
5. **Heatmap** (SVG frente/costas) consumindo `recuperacaoDoMusculo` + painel de volume (spec seção 9).
6. Camada LLM: gerador de ficha e de calistenia (`prompts_sistema_llm.md` seções 1–2) + validação.
7. Planejador mensal (spec seção 5, prompt seção 3) com validação das regras de recuperação.
8. Troca de sessões e atividades extras (spec seção 6b/6c) recalculando heatmap.
9. Módulo corrida / periodização (spec seção 2).
10. Relatório de fim de ciclo (spec seção 7, prompt seção 4).
11. PWA (manifest, service worker), gráficos e polimento.

Comece confirmando os testes do `domain/` e montando o modelo de dados. Pergunte se alguma decisão de stack (na seção 0 da spec) precisar mudar antes de gerar código.
