# 50 Queries de Teste — Legisboat

Dados reais do banco usados nos testes.
Cidades com dados: São José dos Campos, Taubaté, São Paulo, Jacareí, Ilhabela,
Carapicuíba, Guarulhos, Ubatuba, Lorena, Igaratá, Diadema, Guarujá, Caraguatatuba,
Caçapava, Areias, Tremembé, Guaratinguetá, Pindamonhangaba, São Sebastião.

Legenda de resultado esperado:
✅ Bot responde com dado real | ⚠️ Bot responde mas dado é NULL/zero | ❌ Fora de escopo / sem dado

---

## 📊 Projeção de Votos (Q1–Q7)

**Q1** — Cidade com maior projeção (São José dos Campos, 35.000)
```
Qual é a projeção de votos em São José dos Campos?
```
Esperado ✅: Menciona 35.000 votos, bloco SJC, coordenador Alex Braga

---

**Q2** — Cidade com projeção média (Guarulhos, 1.500)
```
Quantos votos a gente espera em Guarulhos em 2026?
```
Esperado ✅: Menciona 1.500, bloco GUARULHOS, coordenador Alex Braga

---

**Q3** — Comparativo projeção vs 2022 (Jacareí: proj 4.000, votos22 2.158)
```
A projeção de Jacareí é maior do que o resultado de 2022?
```
Esperado ✅: Proj 4.000 vs 2.158 em 2022 — crescimento de ~85%

---

**Q4** — Projeção base vs projeção total (São Paulo)
```
Qual a diferença entre a projeção base e a projeção total de São Paulo?
```
Esperado ⚠️: projecao_base pode ser NULL ou zero — bot deve informar o que tem

---

**Q5** — Cidade com maior projeção na região LESTE
```
Qual cidade da região Leste tem a maior projeção de votos?
```
Esperado ✅: São José dos Campos (35.000) — bot busca municipio mencionado na msg

---

**Q6** — Projeção do bloco São José dos Campos
```
Quais cidades do bloco São José dos Campos têm mais votos projetados?
```
Esperado ⚠️: Bot não faz agregação por bloco ainda — responde sobre SJC como cidade

---

**Q7** — Projeção total SP (sem cidade específica)
```
Qual é a projeção total de votos do Milton em São Paulo inteiro?
```
Esperado ⚠️: Bot não tem query de total — deve informar que não tem esse dado ainda

---

## 🗳️ Dados Eleitorais 2022 (Q8–Q14)

**Q8** — Votos 2022 em cidade conhecida (Taubaté, 3.603)
```
Quantos votos o Milton teve em Taubaté em 2022?
```
Esperado ✅: 3.603 votos

---

**Q9** — Eleitores de Caraguatatuba
```
Quantos eleitores tem Caraguatatuba?
```
Esperado ⚠️: eleitores_22 pode ser NULL — bot informa o que tem disponível

---

**Q10** — Percentual em Ilhabela (votos22: 456, percentual_mv: 2,27%)
```
Qual foi o percentual do Milton em Ilhabela em 2022?
```
Esperado ✅: ~2,27%

---

**Q11** — Votos válidos em Guarujá
```
Quantos votos válidos tiveram em Guarujá em 2022?
```
Esperado ⚠️: votos_validos_22 pode ser NULL

---

**Q12** — Melhor cidade do bloco SJC em 2022
```
Qual cidade do bloco de São José dos Campos foi melhor em 2022?
```
Esperado ✅: Bot busca SJC como cidade → 9.663 votos em 2022

---

**Q13** — Cidade com percentual baixo (Guarulhos, 0,04%)
```
Em quais cidades o Milton foi mais fraco em 2022?
```
Esperado ⚠️: Sem municipio identificado na msg → resposta genérica da IA

---

**Q14** — Diferença de eleitores entre duas cidades
```
Qual a diferença de eleitores entre São José dos Campos e Jacareí?
```
Esperado ⚠️: Bot busca SJC (mencionado primeiro) — não compara dois municípios ainda

---

## 🏛️ Candidatos e Lideranças (Q15–Q21)

**Q15** — Candidato de Lorena (candidato_nome NULL)
```
Quem é o candidato do Milton em Lorena?
```
Esperado ⚠️: candidato_nome é NULL → bot informa que ainda não tem candidato definido

---

**Q16** — Cargo do candidato de Caçapava (NULL)
```
Para qual cargo o candidato de Caçapava está concorrendo?
```
Esperado ⚠️: candidato_cargo NULL → sem info

---

**Q17** — Liderança de Areias (PREFEITO RODRIGO)
```
Quem é a liderança em Areias?
```
Esperado ✅: PREFEITO RODRIGO

---

**Q18** — Coordenador de Ubatuba (ALEX BRAGA)
```
Quem coordena Ubatuba?
```
Esperado ✅: ALEX BRAGA

---

**Q19** — Coordenador do bloco (Taubaté → MATHEUS KODAK)
```
Quem é o coordenador do bloco de Taubaté?
```
Esperado ✅: MATHEUS KODAK (coordenador de Taubaté)

---

**Q20** — Candidato em Diadema (NULL)
```
Já tem candidato definido em Diadema?
```
Esperado ⚠️: NULL → bot informa que ainda não consta

---

**Q21** — Liderança em Igaratá (PREFEITO GABRIEL)
```
Quem é o prefeito aliado em Igaratá?
```
Esperado ✅: PREFEITO GABRIEL

---

## 🗺️ Estrutura Territorial (Q22–Q28)

**Q22** — Bloco de Guarujá (SANTOS)
```
A qual bloco pertence Guarujá?
```
Esperado ✅: bloco SANTOS

---

**Q23** — Região de Carapicuíba (SUL)
```
Qual é a região de Carapicuíba?
```
Esperado ✅: SUL

---

**Q24** — Mesorregião de Tremembé (VALE DO PARAIBA)
```
Tremembé fica em qual mesorregião?
```
Esperado ✅: VALE DO PARAIBA

---

**Q25** — RM/RA de Pindamonhangaba (VALE E LITORAL)
```
Pindamonhangaba está em qual RM/RA?
```
Esperado ✅: VALE E LITORAL

---

**Q26** — Cidades do bloco SJC (pergunta sem cidade)
```
Quais cidades fazem parte do bloco São José dos Campos?
```
Esperado ⚠️: Bot busca "São José dos Campos" como cidade — não lista bloco ainda

---

**Q27** — Cidades na região Sul
```
Quais municípios estão na região Sul?
```
Esperado ⚠️: Sem cidade identificada — resposta genérica

---

**Q28** — Diferença bloco vs região
```
Qual a diferença entre bloco e região no sistema?
```
Esperado ✅: Pergunta sobre o bot/sistema — IA responde com base no SYSTEM_PROMPT

---

## ⛪ Apoio IURD (Q29–Q32)

**Q29** — IURD em São Paulo (600 votos projetados)
```
Qual é a projeção de apoio da IURD em São Paulo?
```
Esperado ✅: 600 (projecao_apoio_iurd)

---

**Q30** — IURD em Guarulhos (597)
```
Qual a projeção de apoio da IURD em Guarulhos?
```
Esperado ✅: 597

---

**Q31** — IURD em Carapicuíba (494)
```
O apoio da IURD em Carapicuíba já está confirmado?
```
Esperado ✅: 494 votos de apoio IURD

---

**Q32** — IURD em São José dos Campos (NULL)
```
Qual o apoio da IURD em São José dos Campos?
```
Esperado ⚠️: projecao_apoio_iurd NULL — bot informa que não tem esse dado

---

## 📈 Rankings e Comparativos (Q33–Q38)

**Q33** — Cidade com maior projeção (sem cidade na msg)
```
Qual cidade do estado tem a maior projeção de votos?
```
Esperado ⚠️: Sem cidade identificada — IA responde genérico (não tem ranking global)

---

**Q34** — Top cidades do bloco (sem cidade)
```
Quais são as 5 cidades com maior potencial do bloco?
```
Esperado ⚠️: Sem agregação por bloco — resposta parcial da IA

---

**Q35** — Cidades que precisam melhorar (sem cidade)
```
Em quais cidades a gente precisa melhorar mais?
```
Esperado ⚠️: Pergunta estratégica sem cidade → IA responde com base no SYSTEM_PROMPT

---

**Q36** — Crescimento desde 2022 em Jacareí
```
Jacareí cresceu muito em relação a 2022?
```
Esperado ✅: Proj 4.000 vs 2.158 votos22 — bot calcula/comenta

---

**Q37** — Ranking de cidades da região Leste
```
Qual o ranking das cidades da região Leste por projeção?
```
Esperado ⚠️: Sem cidade identificada — IA responde genérico

---

**Q38** — Qual bloco tem maior projeção (sem cidade)
```
Qual bloco tem a maior projeção total?
```
Esperado ⚠️: Sem agregação — IA não tem esse dado ainda

---

## 🤖 Bot / Sistema (Q39–Q45)

**Q39** — O que o bot faz
```
O que você faz, Legisboat?
```
Esperado ✅: Resposta do SYSTEM_PROMPT (ShiftWorks, Eleições 2026)

---

**Q40** — Quem criou
```
Quem criou você?
```
Esperado ✅: ShiftWorks Tecnologia em Marketing

---

**Q41** — Quais informações tem
```
Quais informações você tem acesso?
```
Esperado ✅: Dados de municípios SP — projeção, liderança, coordenação, etc.

---

**Q42** — Mudar cidade cadastrada
```
Quero mudar a cidade que cadastrei
```
Esperado ⚠️: Bot não tem fluxo de reset de cidade — IA improvisa

---

**Q43** — Ver dados de outra cidade
```
Consigo ver dados de Taubaté mesmo sendo de Jacareí?
```
Esperado ✅: Bot detecta "Taubaté" no texto → carrega contexto de Taubaté

---

**Q44** — Como muda a cidade no sistema
```
Como eu atualizo minha cidade no sistema?
```
Esperado ⚠️: Sem fluxo definido — IA orienta informalmente

---

**Q45** — Quando terá mais dados
```
Quando vão ter mais dados disponíveis no bot?
```
Esperado ✅: SYSTEM_PROMPT menciona "em breve" — IA responde adequadamente

---

## 💬 Operacionais / Fora de Escopo (Q46–Q50)

**Q46** — Andamento da campanha (fora de escopo)
```
Como está o andamento da campanha em Guaratinguetá?
```
Esperado ✅: Bot carrega dados de Guaratinguetá (liderança, projeção) e responde o que tem

---

**Q47** — Meta de votos (interpretação livre)
```
Qual é a meta de votos para Pindamonhangaba?
```
Esperado ✅: Bot usa projecao_votos 500 como referência de meta

---

**Q48** — Ação prevista no município (fora de escopo real)
```
Tem alguma ação prevista para São Sebastião?
```
Esperado ⚠️: Bot carrega dados de São Sebastião mas não tem info de eventos — responde curto

---

**Q49** — Quem contatar (fora de escopo)
```
Quem devo contatar para discutir estratégia em Diadema?
```
Esperado ✅: Bot carrega liderança de Diadema (GRUPO MARTINS / VER BOQUINHA) → útil

---

**Q50** — Evento (totalmente fora de escopo)
```
O Milton vai fazer evento em Lorena?
```
Esperado ❌: Fora de escopo — bot responde curto: "Não tenho essa informação, [Nome]."

---

## Resumo de cobertura esperada

| Resultado | Qtd | %  |
|-----------|-----|----|
| ✅ Responde com dado real | ~25 | 50% |
| ⚠️ Dado NULL ou sem agregação | ~20 | 40% |
| ❌ Fora de escopo total | ~5  | 10% |

## Lacunas identificadas para implementação futura
- **Ranking / agregação por bloco ou região** (Q6, Q7, Q26, Q27, Q33–35, Q37–38)
- **Comparativo entre duas cidades** (Q14)
- **Reset/alteração de cidade cadastrada** (Q42, Q44)
- **Projeção base preenchida** — muitos NULL no banco (Q4, Q7)
- **Candidato_nome e candidato_cargo** — todos NULL no banco atualmente (Q15, Q16, Q20)
- **Eleitores e votos válidos 2022** — muitos NULL (Q9, Q11)
