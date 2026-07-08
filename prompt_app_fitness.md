# Prompt para construir o app de acompanhamento fitness (corrida + academia + calistenia)

> **Como usar:** cole este documento inteiro num agente de código (Claude Code, Cursor, v0, Bolt, Lovable etc.). Ajuste a seção **0. Stack** conforme sua preferência. As seções **8 (Regras de domínio)** e **11 (Dados semente)** são o coração da lógica — não remova.

---

## 0. Stack (ajuste aqui)

Construa um **PWA mobile-first** (uso primário no celular, na academia/rua) com:

- **Front-end:** React + Vite + TypeScript, Tailwind. Componentes acessíveis, tema claro/escuro.
- **Estado/persistência:** local-first. Use IndexedDB (via Dexie) para funcionar **offline**; sincronização opcional com Supabase (Postgres + Auth) se `SUPABASE_URL` estiver configurado.
- **Idioma:** **português do Brasil** em toda a UI. Datas/números no formato BR.
- **Distribuição:** instalável como PWA (manifest + service worker). Sem necessidade de app store.

> Alternativas aceitáveis se eu pedir: React Native/Expo (app nativo) ou Next.js. Mantenha a lógica de domínio isolada em módulos puros para trocar de UI sem reescrever regras.

---

## 1. Visão geral

Um app pessoal que unifica **três modalidades** de treino num só lugar — **corrida**, **academia (musculação)** e **calistenia** — com dois diferenciais:

1. Um **mapa de recuperação muscular** que enxerga as três modalidades (e atividades extras) juntas e evita sobrecarga.
2. Um **planejador mensal** que monta o mês inteiro a partir de quantas sessões de cada tipo a pessoa quer por semana, e ao fim gera um **relatório** com índices de qualidade.

Módulos:

1. **Corrida** — planos periodizados a partir de uma meta.
2. **Academia** — biblioteca de fichas + gerador de ficha por IA a partir dos aparelhos disponíveis.
3. **Calistenia** — gerador de treino por IA a partir de poucos equipamentos (barra, banco, tapete…), com progressões por dificuldade.
4. **Planejador mensal** — combina as três modalidades num plano do mês, respeitando recuperação.
5. **Registro de treinos** — log do que foi feito, com nota de qualidade, troca de sessões e atividades extras (tênis, futebol…).
6. **Painel/Recuperação** — mapa corporal (heatmap) + alertas.
7. **Relatório** — fechamento do ciclo com adesão, qualidade e volume.

---

## 2. Módulo Corrida (planejamento periodizado)

O usuário define uma **meta** (ex.: "correr 10 km", "5 km em 25 min", "primeira meia maratona") e uma **data-alvo** (ou "sem prova, só evoluir"). O app gera um **plano semanal** e o acompanha.

**Estrutura obrigatória do plano (periodização):**

- Fases na ordem: **Base → Build → Pico → Taper** (esta última só se houver prova).
- **Base:** maioria corridas fáceis/conversacionais; introduzir *strides* (6–8 × 100 m) 2×/semana; longão que cresce aos poucos. Sem intervalados ainda.
- **Build:** adicionar 1–2 sessões de qualidade/semana (tempo/limiar, intervalados, tiros em ladeira), mantendo a base.
- **Pico:** treinos mais específicos da prova, volume estabiliza.
- **Taper:** cortar volume 40–60% em 2–3 semanas, **mantendo** um pouco de intensidade (tiros curtos).

**Regras que o app DEVE impor (validar antes de gerar/editar plano):**

- Aumento de volume semanal **≤ 10%**.
- **Semana de recuo (deload)** a cada 3–4 semanas (reduzir ~20–25%).
- Distribuição de intensidade ~**80% fácil / 20% forte** (regra 80/20).
- **Nunca** pular a base: no início de qualquer ciclo novo, 2–4 semanas só de corrida fácil (protege tendões/ossos, que se adaptam mais devagar que o sistema cardiovascular).
- No máximo 1 dia de descanso obrigatório/semana; sinalizar se houver dois dias duros seguidos.

**Tipos de treino de corrida:** fácil/regenerativo, longão, tempo/limiar, intervalado (VO2máx), fartlek, tiros em ladeira, ritmo de prova, strides.

Cada corrida registrada guarda: tipo, distância, duração, pace, RPE (1–10) e o quanto usou as pernas (impacto no heatmap — seção 8).

---

## 3. Módulo Academia (fichas + gerador por IA)

### 3a. Biblioteca de fichas
- O usuário pode **carregar/cadastrar fichas próprias** (ex.: "Ficha A - Peito/Tríceps"), com exercícios, séries × reps, carga sugerida e descanso.
- Fichas ficam salvas e reutilizáveis.

### 3b. Gerador de ficha por IA
1. Usuário **seleciona os aparelhos disponíveis** a partir do catálogo de equipamentos comuns em academias brasileiras (**seção 11a**). Pode marcar "tenho tudo" ou selecionar itens.
2. Define **objetivo** (força, hipertrofia, resistência, condicionamento), **frequência**, **tipo de divisão** (full body, upper/lower, push/pull/legs, ABC…) e restrições (lesões, tempo/sessão).
3. App chama a **LLM** (seção 10) → ficha em **JSON estruturado**.
4. App valida o JSON contra as regras (seção 8) e exibe pra revisão/edição antes de salvar.

---

## 4. Módulo Calistenia (gerador por IA)

Mesma lógica do módulo de academia, mas com **peso corporal** e poucos "equipamentos" — na calistenia uma barra, um banco ou um tapete já são um equipamento, e com pouca coisa dá pra montar treino completo.

**Fluxo:**
1. Usuário seleciona os **equipamentos de calistenia disponíveis** (**seção 11b**) — pode ser só "espaço livre / peso corporal".
2. Define objetivo (força, hipertrofia, resistência, skills), frequência, divisão e nível (iniciante/intermediário/avançado) + restrições.
3. LLM gera o treino em **JSON estruturado** (mesmo schema da ficha, seção 10).

**Regra específica da calistenia (importante):** na calistenia a progressão **não é adicionar carga**, e sim aumentar a **dificuldade da variação/alavanca**. O treino gerado deve, para cada movimento, indicar a **variação atual e a próxima progressão**. Exemplos:
- Flexão: inclinada → normal → declinada → diamante → arqueiro → um braço.
- Barra/pull-up: australiana (remada) → negativa → completa → arqueira → um braço.
- Agachamento: livre → búlgaro → pistol assistido → pistol.
- Core: prancha → hollow hold → L-sit → dragon flag.
- Skills (só se objetivo = skills): muscle-up, front lever, planche (com progressões).

Faixas de reps na calistenia: força = variações difíceis com poucas reps (2–6); hipertrofia = variações medianas 6–15; resistência = variações fáceis, reps altas. Ver seção 8.

---

## 5. Planejador mensal (combina as 3 modalidades)

O usuário informa a **frequência semanal desejada** de cada modalidade — ex.: "3 corridas, 2 academia, 1 calistenia por semana" — os **dias disponíveis** e restrições. A partir disso, o app chama a **LLM** e monta um **plano do mês** (≈4 semanas) num calendário.

**O planejador DEVE respeitar (validar após a geração):**
- Espaçar o mesmo grupo muscular conforme as janelas de recuperação (seção 8.2).
- Não empilhar **leg day pesado + longão/intervalado** em <24h (seção 8.4).
- Manter 80/20 na corrida e incluir a **semana de deload**.
- Distribuir descanso adequado (a maioria das pessoas rende bem com 3–5 dias de treino/semana).

Saída = lista de sessões por dia (modalidade + tipo/foco). O plano é **totalmente editável** (ver seção 6: troca, substituição, atividades extras).

---

## 6. Registro de treinos, qualidade, troca e atividades extras

### 6a. Registro + índice de qualidade
Cada sessão realizada é registrada com:
- Dados da execução (ficha/exercícios feitos, séries/reps/carga reais, ou dados da corrida).
- **RPE** (esforço, 1–10).
- **Índice de qualidade** da sessão: **Ruim / Médio / Bom** (ou escala 1–5) + campo livre de observação ("como me senti", "faltou energia" etc.).
Esses dados alimentam o relatório (seção 7) e o heatmap (seção 9).

### 6b. Troca / substituição de sessão
Em qualquer dia planejado, o usuário pode:
- **Trocar a modalidade** (estava academia, mas quer correr ou fazer calistenia hoje).
- **Substituir um exercício** dentro da ficha.
- **Mover a sessão** para outro dia.
- **Marcar como não feita** (com motivo opcional).
Ao trocar, o plano e o heatmap **recalculam** (a nova sessão passa a contar na recuperação; a antiga sai).

### 6c. Atividades extras (esportes avulsos)
O usuário pode **adicionar uma atividade extra** que não estava no plano — ex.: "hoje joguei 2h de futebol", "1h de tênis". Cada atividade guarda: tipo, duração, RPE e (opcional) intensidade. Ela **conta no heatmap** conforme o mapeamento de músculos/carga do esporte (seção 8.5) e aparece no relatório. Deixe cadastrar esportes fora da lista, com mapeamento manual.

---

## 7. Relatório final (fechamento do ciclo)

Ao fim do plano (ou sob demanda), o app gera um **relatório** com:
- **Adesão:** sessões planejadas × realizadas (%), por modalidade.
- **Qualidade:** distribuição de Ruim/Médio/Bom e média por modalidade/semana; identificar padrões (ex.: "treinos de terça costumam ser 'ruins'").
- **Volume:** séries/semana por grupo muscular × alvo (10–20); progressão de volume/pace na corrida.
- **Atividades extras** realizadas no período.
- **Resumo em texto + sugestões para o próximo ciclo**, gerado pela LLM a partir dos números acima (ex.: "reduza volume de perna na semana 3", "sua qualidade cai quando corrida e academia caem no mesmo dia").

Exportável (PDF/imagem/compartilhar).

---

## 8. Regras de domínio (baseadas em evidência — NÃO improvisar)

Módulo puro (`domain/rules.ts`), usado na validação de fichas/planos e no motor de recuperação.

### 8.1 Faixas por objetivo
- **Força:** 2–6 reps, carga alta (~80–95% 1RM) ou variação difícil (calistenia), descanso 2–5 min.
- **Hipertrofia:** 6–12 reps foco (faixa útil ampla, 5–30), descanso 1,5–3 min.
- **Resistência muscular:** 15+ reps, descanso curto.
- **Volume semanal alvo por grupo muscular:** **10–20 séries/semana** (iniciante: 6–10), contando séries **indiretas** (8.3).
- Treinar cada grupo **2–3×/semana** (melhor que 1× para hipertrofia).

### 8.2 Janelas de recuperação (para o heatmap)
- **Músculos grandes** (quadríceps, posteriores, glúteos, costas, peito): **48–72h**.
- **Músculos menores** (bíceps, tríceps, panturrilha, antebraço, abdômen): **24–36h**.
- Síntese proteica elevada ~24–48h pós-treino → não bater o mesmo grupo pesado antes disso.
- Ajustar por volume/intensidade, RPE, idade e sono (se informados).

### 8.3 Ativação indireta (crítico)
Cada exercício → **músculo primário + secundários** com peso. Ex.:
- Supino → peito (1.0), tríceps (0.5), ombro anterior (0.4).
- Puxada/remada → dorsal (1.0), bíceps (0.5), ombro posterior (0.3).
- Agachamento/leg press → quadríceps (1.0), glúteo (0.7), posterior (0.4), lombar (0.3).
- Terra → posterior (1.0), glúteo (0.8), lombar (0.8), trapézio (0.4).
- Barra/pull-up → dorsal (1.0), bíceps (0.6), core (0.3).
- Flexão/dips → peito (1.0), tríceps (0.6), ombro (0.4).

Volume do músculo = séries diretas + Σ(séries de outros exercícios × peso).

### 8.4 Interação entre modalidades (DIFERENCIAL)
Pernas e lombar são **recurso compartilhado** entre correr, treinar perna e calistenia de perna.
- Longão/intervalado conta como carga em quadríceps, posteriores, panturrilha e glúteos.
- **Alertar** quando leg day pesado e corrida dura caírem em <24h, ou quando o mesmo grupo aparecer sobrecarregado somando modalidades.
- Sugerir: corrida fácil em dias de perna; longão longe do leg day.

### 8.5 Atividades extras (mapeamento padrão p/ heatmap)
Cada esporte tem músculos/carga default (editável), somando RPE × duração:
- **Futebol:** pernas alto (quadríceps, posterior, panturrilha, glúteo) + conta como carga de corrida/impacto.
- **Tênis / squash / beach tennis:** ombro e antebraço do lado dominante, core, pernas moderado.
- **Basquete / vôlei:** pernas (saltos) + panturrilha, ombro moderado.
- **Ciclismo:** quadríceps, glúteo, panturrilha (baixo impacto).
- **Natação:** costas, ombro, core (baixo impacto nas pernas).

---

## 9. Painel de Recuperação (mapa corporal / heatmap)

- **Silhueta (frente e costas)** em SVG, regiões musculares clicáveis.
- Cada músculo colorido por **status de recuperação** (dias desde o estímulo, volume direto + indireto, janelas 8.2): Verde = pronto · Amarelo = recuperando · Vermelho = fadigado.
- Ao tocar: histórico recente, volume da semana × alvo (10–20), horas até liberar.
- **Alertas:** "Quadríceps ainda em recuperação (30h) — evite leg day hoje"; "Peito em 22 séries nesta semana, acima do alvo".
- Widget de **carga semanal de corrida** com aviso se aumento > 10%.

---

## 10. Integração com a LLM

Usada em: **gerar ficha (academia)**, **gerar treino (calistenia)**, **montar plano mensal** e **resumir relatório**.

- **Provedor configurável** por env (`LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`). Suportar free tiers: **Google Gemini**, **Groq**, **OpenRouter**. Abstrair numa interface (`generateWorkout`, `generateMonthlyPlan`, `summarizeReport`).
- **Forçar saída JSON estruturada** (JSON mode / schema). Nada de texto solto (exceto o resumo narrativo do relatório).
- **Prompt de sistema** injeta as regras da seção 8 (faixas, volume 10–20, frequência 2–3×, recuperação, só usar equipamentos selecionados; na calistenia, progredir por variação e não por carga).
- **Validar** todo JSON no cliente contra schema + regras; rejeitar/reperguntar se extrapolar faixas ou usar equipamento indisponível.
- Tratar rate limit com fallback e "tentar de novo".

**Schema de ficha/treino (academia e calistenia):**
```json
{
  "nome": "Treino A - Empurrar",
  "modalidade": "academia",
  "objetivo": "hipertrofia",
  "exercicios": [
    {
      "nome": "Supino reto máquina",
      "equipamento": "supino_maquina",
      "musculo_primario": "peito",
      "musculos_secundarios": ["triceps", "ombro_anterior"],
      "series": 4,
      "reps": "8-12",
      "descanso_seg": 90,
      "progressao_atual": null,
      "proxima_progressao": null,
      "observacao": "cadência controlada"
    }
  ]
}
```
(Na calistenia, `equipamento` pode ser `peso_corporal` e os campos `progressao_atual`/`proxima_progressao` são preenchidos.)

**Schema do plano mensal:**
```json
{
  "inicio": "2026-07-14",
  "semanas": [
    {
      "numero": 1,
      "deload": false,
      "dias": [
        { "data": "2026-07-14", "modalidade": "corrida", "foco": "fácil 5km" },
        { "data": "2026-07-15", "modalidade": "academia", "foco": "empurrar" },
        { "data": "2026-07-16", "modalidade": "calistenia", "foco": "pull + core" },
        { "data": "2026-07-17", "modalidade": "descanso", "foco": null }
      ]
    }
  ]
}
```

---

## 11. Dados semente (catálogos pré-carregados)

Cada item vinculado ao(s) músculo(s) que trabalha, para alimentar o heatmap. Permitir o usuário adicionar itens fora da lista.

### 11a. Equipamentos de academia (Brasil)
**Pernas/glúteos:** leg press 45°, leg press horizontal, hack machine, cadeira extensora, cadeira/mesa flexora, flexora em pé, cadeira abdutora, cadeira adutora, panturrilha em pé, panturrilha sentado, agachamento no Smith, glúteo na polia/coice, hip thrust.
**Peito:** supino reto (livre e máquina), inclinado, declinado, crucifixo (voador/peck deck), crossover, flexão.
**Costas:** puxada frente, puxada aberta/fechada, remada baixa (sentada), remada curvada, remada cavalinho, remada máquina, pullover, barra fixa.
**Ombros:** desenvolvimento (máquina/halteres), elevação lateral, elevação frontal, crucifixo invertido, encolhimento.
**Braços:** rosca direta, scott, martelo, alternada, tríceps pulley (barra/corda), testa, francês, mergulho/paralelas.
**Core:** abdominal máquina, prancha, elevação de pernas, cadeira romana.
**Cardio:** esteira, bike (vertical/horizontal), elíptico, escada, remo ergômetro.
**Livres/funcional:** halteres, barras, anilhas, kettlebell, banco ajustável, corda naval, TRX, caixa de salto.

### 11b. Equipamentos de calistenia
Poucos itens já viabilizam treino completo:
- **Barra fixa** (pull-ups, muscle-up, remada australiana).
- **Barras paralelas / parallettes** (dips, L-sit, apoios).
- **Banco / caixa / degrau** (flexão inclinada/declinada, step-up, búlgaro, dips no banco).
- **Tapete / colchonete** (core, prancha, mobilidade, agachamento).
- **Argolas** (dips e remadas instáveis, skills).
- **Elásticos / faixas** (assistência em progressões).
- **Corda de pular** (condicionamento).
- **TRX / fita de suspensão** (remadas, flexões, core).
- **Espaço livre / só peso corporal** (flexão, agachamento, afundo, burpee, mountain climber, prancha, pistol).
- (Opcional) **playground / barras de praça** — comum no Brasil para treino ao ar livre.

---

## 12. Modelo de dados (mínimo)

- `Meta` (corrida): objetivo, distância/tempo alvo, data-alvo, nível.
- `PlanoCorrida`: fases, semanas, sessões (tipo, volume, intensidade).
- `PlanoMensal`: início, semanas[] com dias (modalidade + foco), flag deload.
- `Exercicio` (catálogo): nome, equipamento, modalidade, músculo primário, secundários[] com pesos, progressões[] (calistenia).
- `Equipamento` (catálogo): id, nome, modalidade (academia/calistenia), músculos.
- `Ficha`/`TreinoCalistenia`: nome, modalidade, objetivo, divisão, exercícios[].
- `AtividadeExtra` (catálogo + log): tipo (futebol, tênis…), músculos/carga default.
- `LogTreino`: data, modalidade (`academia`|`corrida`|`calistenia`|`extra`), ref (ficha/plano/atividade), execução real (reps/carga/distância/duração), RPE, **qualidade** (ruim/médio/bom), observação, flags de troca (substituiu/moveu/não fez).
- `EstadoRecuperacao` (derivado): por músculo, calculado on-the-fly dos logs (inclui atividades extras).

---

## 13. UX / detalhes

- Registrar treino tem que ser **rápido** (uso na academia/rua): selecionar sessão do dia, marcar séries, ajustar carga, dar a nota de qualidade em 1 toque. Timer de descanso embutido.
- Tela inicial = painel de recuperação + "sessão de hoje" (do plano mensal) + botões rápidos de **trocar** e **adicionar atividade extra**.
- Calendário do mês mostrando o plano, com cores por modalidade e status (feito/pendente/trocado).
- Gráficos: carga por exercício, volume semanal por grupo, pace/volume de corrida, distribuição de qualidade.
- Tudo em PT-BR, offline-first, instalável.

---

## 14. Entregáveis

1. App funcionando (build PWA).
2. Módulo `domain/` (regras da seção 8) com testes unitários: volume com ativação indireta, status de recuperação por músculo, validação de plano de corrida e de plano mensal, contribuição de atividades extras no heatmap.
3. Catálogos semente populados (academia, calistenia, exercícios com mapeamento muscular e progressões, atividades extras).
4. README: como configurar a chave da LLM e trocar de provedor.

Ordem sugerida: modelo de dados → `domain/` → heatmap → geradores por IA (ficha, calistenia) → planejador mensal → registro/troca/atividades extras → relatório.
