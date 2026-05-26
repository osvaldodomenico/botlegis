DOSSIÊ TÉCNICO E FUNCIONAL
Centro de Comando — Milton Vieira 2026
Sistema: centro-de-comando-mv.vercel.app
Data de documentação: 26/05/2026
Tipo: Painel político estratégico — campanha para Deputado Federal SP (eleição 04/10/2026)

1. VISÃO GERAL DO SISTEMA
O Centro de Comando Milton Vieira 2026 é um painel web privado (acesso via login ADMIN) desenvolvido para centralizar toda a inteligência estratégica, operacional e de execução da campanha de reeleição de Milton Vieira ao cargo de Deputado Federal por São Paulo. O sistema integra dados do TSE, IBGE, pesquisas próprias, redes sociais e agenda de campanha em uma única interface.
Stack tecnológica observada: Next.js (React) hospedado na Vercel, design em modo escuro opcional, navegação lateral hierárquica, componentes de gráficos, tabelas e mapas interativos.
Acesso: Autenticado — campo "ADMIN" exibido no cabeçalho superior direito, com botão "Sair".

2. ESTRUTURA DE NAVEGAÇÃO
O menu lateral esquerdo é organizado em 5 módulos principais, cada um expansível:
01 VISÃO

Centro de Comando (cockpit geral)
Insights TSE 2022 (auditoria estratégica com dados reais)

02 INTELIGÊNCIA

Histórico TSE (1998–2022, com mapas por eleição)
Atuação Parlamentar (mandato, secretarias, CEAP)
Sondagem & Dores (URA + SondaIntel + dados SJC 2024)
Matemática dos Votos (canibalização + ranking de praças)
Redes Sociais (IG, FB, YT, TikTok — Milton + Milton Jr)

03 ESTRATÉGIA

Vale do Paraíba (Praça-âncora nº 1 — 76 IURD)
Zona Sul Capital (Praça-âncora nº 2 — 130 IURD)
Cinturão Sudoeste (Praça-âncora nº 3 — Embu/Taboão)
Jundiaí (manutenção — bloqueada por Fred Machado)

04 EXECUÇÃO

Igrejas Universal (253 IURD em 3 blocos)
Rede Política (líderes + núcleo duro)
Agenda & Marcos (kanban + cronograma)

05 SEGURANÇA

Blindagem (vulnerabilidades, auditoria CEAP, monitoramento)


3. PÁGINAS E FUNCIONALIDADES DETALHADAS
3.1 — Centro de Comando (/comando)
Descrição: Cockpit principal da campanha. Concentra os KPIs mais críticos em uma única tela.
Elementos funcionais:

Cronômetro regressivo em tempo real: dias, horas, minutos e segundos até 04/10/2026 (eleição). Exibia 130 dias no momento da captura.
Card do Candidato: nome, partido (Republicanos-SP), situação (Reeleição), mandatos (7), votos em 2022 (98,5k), igrejas (253).
Diretriz nº 1 — Vale do Paraíba: destaque visual em azul escuro com posicionamento estratégico, menção ao escritório regional em SJC, Milton Jr vereador, cidadão joseense.
Trajetória Eleitoral: mini-gráfico sparkline de 1998 a 2022 com anotação "+27,8% vs 2018". Link "ver mapa 2022".
Meta 04/10/26: 150k votos (+52,2% vs 2022).
Pesquisa — Onda 1: URA + SondaIntel, junho/2026, 3 praças. URA TEL: 65k respostas, SondaIntel: ~21,5k.
Redes Sociais: Meta Graph pendente. 4 plataformas, 2 contas.
Atuação parlamentar recente: dois cards — Secretaria Municipal de Habitação (jul/2023–dez/2024, programa Pode Entrar) e Secretaria Municipal de Inovação e Tecnologia (jan/2025–mar/2026, reassumiu mandato em 31/03/2026).
Próximos Marcos: linha do tempo com 5 datas críticas (07/06 Fim da Fundação, 08/06 Início SondaIntel, 28/06 Rota Estratégica, 06/09 Última correção pré-urna, 04/10 ELEIÇÃO).
Decomposição estratégica 2022: Zona Sul Capital IURD (21.840 votos, 47%) vs Outras zonas da capital (24.750 votos, 53%). Links "ver praça-âncora nº 2" e "ver mapa completo".
Macro da Campanha: 7 frentes integradas: Inteligência, Comunicação, WhatsApp, Igrejas, Rede Política, Operação, Centro de Comando.
Doutrina BOYD — Loop OODA: diagrama com 4 etapas: Observe (Inteligência), Orient (Vale/Schwerpunkt), Decide (Matemática/150k), Act (Igrejas/Rede/Agenda). Frases estratégicas: "Orientation is the Schwerpunkt", "Operate inside their OODA loop", "Implicit over explicit".


3.2 — Insights TSE 2022 (/comando/insights)
Descrição: Auditoria estratégica com dados reais do TSE 2022 vs estimativas anteriores da campanha.
Seção 1 — Realidade × Estimativa Anterior:
Tabela comparativa com 6 linhas mostrando o que a campanha assumia vs o TSE real, com delta percentual. Exemplos:

Vale do Paraíba: estimativa 36.700 → real 24.762 (−32%)
SP Capital (ZS IURD): estimativa 21.840 → real 12.205 (−44%)
Cinturão Sudoeste: estimativa ~4.500 → real 9.691 (+115%)
Capital outras zonas: estimativa 24.750 → real 35.183 (maior bloco, sem estratégia)

Seção 2 — Distribuição real por praça estratégica: Gráfico de barras horizontais com 7 praças. Capital outras zonas lidera com 35.183 votos (35,7%).
Seção 3 — Top 15 bairros da capital (47.388 votos): Americanópolis (878), Jardim Miriam (633), Chácara Santa Maria (542), etc.
Seção 4 — Bairros-órfãos da capital (≥200 votos): 15 bairros com voto relevante NÃO classificados como Zona Sul — oportunidades não mapeadas.
Seção 5 — Top 15 municípios fora da capital: São José dos Campos lidera com 9.663 votos, seguido por Taboão da Serra (3.703) e Taubaté (3.603).
Seção 6 (presumida da sessão anterior) — Perfil por renda e eficiência.
Seção 7 — Perfil socioeconômico: Cruzamento TSE 2022 × Censo IBGE 2022 por distrito. Top distritos: Grajaú (5.276 votos, renda média R$ 2.063), Capão Redondo (4.682, R$ 2.352), Jardim Ângela (4.252, R$ 1.991), Cidade Ademar (4.029, R$ 2.814).
Seção 8 — Decisões estratégicas forçadas pelos dados: 6 itens de ação estratégica derivados da análise, incluindo revisão da meta do Vale, criação de estratégia para "Capital outras zonas", refinamento da classificação Zona Sul Capital, investigação de Jundiaí, consolidação do Cinturão Sudoeste, e cruzamento da lista das 253 igrejas com dados TSE.

3.3 — Histórico TSE (/comando/historico)
Descrição: Registro completo das 6 campanhas eleitorais de Milton Vieira com dados oficiais do TSE.
Gráfico de barras horizontais com as 6 eleições e percentual de votos em cada uma. Tabela com: ano, cargo, partido, votos e resultado. Cada linha tem botão "ver mapa" que abre o mapa coroplético daquela eleição.
AnoCargoPartidoVotosResultado1998ALESPPRONA56.0991º mandato2006Federal (suplência)PFL83.0454ª suplência (assumiu 2009)2010ALESPDEM71.5233º mandato ALESP2014ALESPPSD92.987Reeleito 4º mandato2018FederalPRB77.1431º federal eleito2022FederalRepublicanos98.557Reeleito 2º federal
Sub-páginas de mapa (/historico/1998, /2006, /2010, /2014, /2018, /2022): cada uma exibe um mapa coroplético interativo do estado de SP com município colorido por intensidade de votos, seguido de tabela com ranking de municípios. A página de 2022 é a mais detalhada, com 46 municípios + Top 30 bairros da capital.

3.4 — Atuação Parlamentar (/comando/atuacao)
Descrição: Ficha completa do mandato parlamentar de Milton Vieira.
Dados do gabinete: Sala 926, Anexo 4, Andar 9, telefone (61) 3215-5926, e-mail dep.miltonvieira@camara.leg.br, situação: Exercício ativo.
Redes oficiais registradas na Câmara: Twitter/X, Facebook, Instagram, YouTube.
KPIs parlamentares:

421 proposições totais (autoria + coautoria)
37 Projetos de Lei próprios
232 Frentes Parlamentares (signatário)
R$ 281k de despesa CEAP total
4 eventos + 1 comissão com participação registrada

Dois cargos executivos exercidos:

Secretaria Municipal de Habitação SP (jul/2023–dez/2024) — coordenou programa "Pode Entrar", pilar narrativo "o deputado que constrói casa".
Secretaria Municipal de Inovação e Tecnologia SP (jan/2025–mar/2026) — comandou SMIT por 15 meses, diversificou perfil religioso com pasta técnica, reassumiu mandato federal em 31/03/2026.

Produção parlamentar por tipo: Emendas (254, 68,6%), Requerimentos (72, 19,5%), PLs (37, 10%), PECs (7, 1,9%).
Eixos temáticos dos PLs: Outros (16), Saúde e PCD (4), Trânsito (3), Família e Fé (3), Consumidor (3), Educação (2), Defesa da Criança (2), Habitação (1), Anistia (1), Aborto (1), São José dos Campos (1).

3.5 — Sondagem & Dores (/comando/sondagem)
Descrição: Painel de pesquisa eleitoral com dois instrumentos ativos e dados reais de SJC 2024.
KPIs principais:

URA Telefone: 65.000 respostas planejadas
SondaIntel Digital: 21.500 respostas planejadas
Sondagem 2024 SJC: 14.636 respostas reais
Praças cobertas: 3 (Sul, Vale, Jundiaí)

URA — Disparo por telefone: Zona Sul/Cone Sul (30.000, 46,2%), Vale do Paraíba (30.000, 46,2%), Jundiaí (5.000, 7,7%). Captura contato → alimenta base WhatsApp. Respostas via DTMF.
SondaIntel — Sondagem digital: Zona Sul/Cone Sul (10.000), Vale (10.000), Jundiaí (1.500). Coleta perfil detalhado (gênero, faixa etária, religião, escolaridade), dores, testes de narrativa. Distribuído via link/QR por redes e igrejas.
Sondagem SJC 2024 (dados reais): 5 indicadores de dor: Insegurança (43,9%), Nostalgia política (57,4%), Dificuldade na saúde (47,5%), Transporte não atende (52,9%), Administração não transparente (54,6%).
Ranking de dores: Gestão do prefeito (35,7% negativo), Manutenção de ruas (33,3%), Saúde (33%), Trânsito (31,5%), Educação/Escolas (próximo), Segurança (próximo).
Top 10 bairros respondentes: Bosque dos Eucaliptos e Urbanova (349 cada), Jardim das Indústrias (249), Jardim Satélite (243).

3.6 — Matemática dos Votos (/comando/votos)
Descrição: Modelo de predição eleitoral com 4 cenários configuráveis.
KPIs de topo:

Meta declarada: 150.000 votos
Patamar 2022: 98.557
Projeção atual: 153.000 (+3.000 acima da meta)
Gap até a meta: 3.000 votos (acima)

4 cenários de predição (tabs selecionáveis):

Otimista — concorrentes abaixo do histórico
Realista (padrão) — histórico + Russomanno 420k
Pessimista — Russomanno estoura
Ajuste Manual — usuário ajusta cada candidato individualmente (campos editáveis por linha)

Ranking de Ataque — 4 praças com estratégia definida:
PraçaVulnerabilidadeTeto eleitoradoMetaEstratégiaVale do ParaíbaBAIXA184.50560.000CONSOLIDARJundiaíALTA65.43518.000ATACARZona Sul/Cone SulBAIXA1.000.90265.000DEFENDEROutras (interior)MUITO ALTA—10.000IGNORAR
Predição de candidatos Republicanos-SP: Tabela com candidatos (Celso Russomanno, Marcos Pereira, etc.) mostrando votos 2018, 2022, MIN, REALISTA, MAX, AMEAÇA, e botão "editar" (habilitado no cenário Ajuste Manual).
Cenários calibrados: Breakdown detalhado da projeção por praça + tabela de canibalização interna do partido.

3.7 — Redes Sociais (/comando/redes)
Descrição: Dashboard de monitoramento de performance nas redes sociais — Milton + Milton Jr.
KPIs globais:

Followers total: 163.100 (+3,0%) — Milton + Milton Jr, 4 plataformas
Alcance 30 dias: 986.000 impressões
Posts publicados (30d): 84 (média 16,8/conta)
Contas ativas: 5/6 (meta: 6 conectadas via API)

Status de integração: Pendente conexão via Meta Graph API + YouTube Data v3. Os números exibidos são estimativas provisórias até a geração dos tokens de API.
Crescimento de followers (12 semanas): Mini-gráficos sparkline por conta:

Instagram Milton: 48.300 (+4,8%)
Facebook Milton: 62.400 (+1,0%)
YouTube Milton: 8.400 (+6,3%)
TikTok Milton: sem conta cadastrada
Instagram Milton Jr: 25.800 (+4,9%)
Facebook Milton Jr: 18.200 (+1,7%)

Seção "Contas" (clicável): cada conta exibe gráfico de histórico detalhado de 12 semanas.

3.8 — Vale do Paraíba (/comando/vale)
Descrição: Página dedicada à Praça-âncora nº 1 — a mais importante da campanha.
Cabeçalho estratégico:

Votos 2022 TSE: 24.762 (25,1% do total Milton)
Meta Vale 2026: 50.000 (2× base 2022)
Igrejas IURD: 76 (Bloco Vale + Catedral da Paz)

Justificativa estratégica: residência em SJC desde 2010, escritório parlamentar regional, Cidadão Honorário de Caraguatatuba e SJC, Milton Vieira Jr vereador reeleito pelo Republicanos em 2024, 76 igrejas IURD + Catedral da Paz (3 mil membros, Jacareí), concorrentes concentrados na capital.
Perfil socioeconômico — 20 distritos: tabela com município, votos, renda média e voto/1k responsáveis. SJC lidera com 8.115 votos, seguido por Taubaté (3.129), Jacareí (2.261), Eugênio de Melo (1.305), Caraguatatuba (1.143), Ubatuba (1.059), Pindamonhangaba (984), Guaratinguetá (950).

3.9 — Zona Sul Capital (/comando/zona-sul-capital)
Descrição: Praça-âncora nº 2 — análise detalhada dos 47.388 votos na capital SP.
KPIs:

Votos capital: 47.388 (48,1% do total Milton)
Renda média Top 10 distritos: R$ 2.688 (vs R$ 4.625 média capital)
Igrejas IURD Bloco ZS: 130

Top 10 distritos por votos: Grajaú (5.276), Capão Redondo (4.682), Jardim Ângela (4.252), Cidade Ademar (4.029), Jardim São Luís (3.442), Campo Limpo (3.370), Cidade Dutra (3.312), Parelheiros (2.478), Jabaquara (2.206), Pedreira (1.901). Total: 34.948 votos = 73,7% da capital.
Cobertura georreferenciada: 1.735 locais de votação da capital cruzados com 27.301 setores censitários × 96 distritos PMSP × renda IBGE 2022. Cobertura: 47.369 dos 47.388 votos (99,96%).
Gráfico de eficiência: scatter plot voto/responsável vs renda por distrito.
Top 30 distritos completo: tabela estendida com todos os distritos mapeados.

3.10 — Igrejas Universal (/comando/igrejas)
Descrição: Mapeamento das 253 igrejas IURD que compõem a base religiosa da campanha.
Estrutura em 3 blocos:

Bloco 01 — Zona Sul de SP: 130 igrejas → praça Zona Sul Capital
Bloco 02 — SJC/Vale do Paraíba: 76 igrejas → praça Vale do Paraíba
Bloco 03 — Jundiaí: 47 igrejas → praça Jundiaí

Apoios extra-IURD: Catedral da Paz (Jacareí) — 3.000 membros.
Avaliação estratégica:

Bloco ZS: ~168 votos/igreja em 2022
Bloco Vale + Catedral da Paz: base territorial consolidada
Bloco Jundiaí: ancoragem religiosa, eleitorado a desenvolver

Risco competitivo: tabela com 3 parlamentares IURD-SP que podem disputar pastores/bispos da base: Vinicius Carvalho (CRÍTICO — 31 anos IURD, saiu dez/22), Marcos Pereira (MÉDIO — presidente nacional Republicanos, bispo licenciado), Maria Rosas (BAIXO-MÉDIO — ligada à Universal). Nota de risco oculto sobre fidelidade dos 253 templos ao bispo regional vs pastor titular, e disputa interna Marcos Pereira/Renato Cardoso.
Próximo passo indicado: obter lista nominal das 253 igrejas (nome, endereço, pastor, telefone, capacidade, bispo regional) para cruzar com TSE por seção.

3.11 — Rede Política (/comando/rede)
Descrição: Sistema de cadastro e gestão de líderes políticos e seu núcleo duro de votos.
KPIs:

Líderes cadastrados: 1 (núcleo duro declarado)
Núcleo duro somado: 6.500 votos diretos prometidos
% da meta de 150k: 4,3%
Praça-foco: Vale (prioridade nº 1 de recrutamento)

Lider cadastrado: Milton Vieira Jr — Vereador SJC — Vale do Paraíba — 6.500 votos — status "ativo".
Distribuição por tipo de líder (todos zerados exceto Vereadores atuais = 1):
Vereadores atuais, Pré-candidatos a vereador, Parceiros políticos, Amigos políticos, Líderes comunitários, Líderes religiosos.
Distribuição por praça: Vale 100%, demais zeradas.
Funcionalidade futura: formulário público de cadastro, mapa do estado com pontos por líder, grafo visual da rede de indicações, score validado por ações comprovadas.
Como funciona o núcleo duro: cada líder declara votos diretos (família + comunidade). Score é atualizado conforme ações comprovadas (compartilhamentos, presença em eventos, indicações confirmadas).

3.12 — Agenda & Marcos (/comando/agenda)
Descrição: Kanban de tarefas da campanha + cronograma de marcos estratégicos.
KPIs:

Total de tarefas: 23
A Fazer: 21 (91% da operação)
Em Andamento: 2 (9%)
Concluídas: 0 (0%)

Sistema de filtros duplo:

FASE: Todas | Diagnóstico (24/05→07/06) | Pesquisa e Rota (08/06→28/06) | Execução (29/06→06/09) | Reta Final (07/09→02/10) | Dia D e Pós (03/10→11/10)
RESPONSÁVEL: Todos | Equipe Campo | Gabriel | Lastro | Lucas | Milton Jr | Paulo Barcelos | SondaIntel

Estrutura dos cards kanban: cada tarefa contém título, prioridade (ALTA/MEDIA), descrição, responsável(eis), praça alvo, fase, data limite com dias restantes, e botão "iniciar" ou "concluir".
Exemplos de tarefas capturadas:

"Mapear lideranças no Cone Sul" (ALTA) — identificar pastores + cabos que não conflitem com Ney Santos — Equipe Campo / Sul — DIAGNÓSTICO — 2026-06-05
"Confirmar lista nominal das 253 igrejas Universal" (ALTA) — Em Andamento — Equipe Campo / Todas — DIAGNÓSTICO — 2026-06-02
"Brief criativo Lastro" (MEDIA) — posicionamento 'deputado que constrói casa' + Vale como casa — Lastro / Todas — DIAGNÓSTICO — 2026-06-03
"Cadastrar Milton Jr e estrutura SJC" (ALTA) — vereadores aliados + núcleo duro de cada — Milton Jr / Vale — DIAGNÓSTICO — 2026-06-04
"Definir scripts URA e SondaIntel" (ALTA) — validar perguntas com base no SJC 2024 — em andamento


3.13 — Blindagem (/comando/blindagem)
Descrição: Sala de guerra defensiva — catálogo de vulnerabilidades + auditoria CEAP + monitoramento de menções adversárias.
3 abas principais:
Aba 1 — Vulnerabilidades (badge "6" ativo):

Total catalogadas: 13
Críticas: 1 | Altas: 5 | Abertas (precisam ação): 3 | Blindadas: 4 (31%)

Filtros por SEVERIDADE: Todas | Crítica | Alta | Média | Baixa
Filtros por STATUS: Todos | Aberta | Em investigação | Blindada | Monitorando
Exemplos de vulnerabilidades documentadas:

"Inquérito Metrópoles · R$ 850 mil em gráficas-fantasma ALESP" — CRÍTICA / EM INVESTIGAÇÃO — impacto previsto: "adversário pode rotular como 'rachadinha'" — contra-narrativa: aguardando confirmação de status (arquivado/ativo) — ação: verificar com TJSP/MPSP e preparar resposta antes de junho/2026.
"SHIFTWORKS · CNPJ aberto 2 semanas antes do retorno do Milton" — ALTA / ABERTA — CNPJ 65.693.427/0001-68, aberto 13/03/2026 (18 dias antes do Milton reassumir) — recebeu R$ 7.000 CEAP em marketing/tecnologia em SJC.

Aba 2 — Auditoria CEAP (badge "6"):
Análise das despesas da cota parlamentar com foco em fornecedores que podem ser atacados. 25 itens catalogados com detalhes de NF, valor, CNPJ e risco de questionamento público.
Aba 3 — Monitoramento (badge "pendente"):
Sistema de monitoramento de menções adversárias — funcionalidade pendente de configuração/integração.

4. FLUXO GERAL DO SISTEMA
Login (ADMIN)
    └── Dashboard Principal (Centro de Comando)
            ├── Módulo 01 VISÃO
            │       ├── Cockpit cronômetro + KPIs macro
            │       └── Insights TSE 2022 (auditoria dados reais)
            ├── Módulo 02 INTELIGÊNCIA
            │       ├── Histórico TSE 1998-2022 (6 eleições + mapas)
            │       ├── Atuação Parlamentar (mandato + secretarias + CEAP)
            │       ├── Sondagem & Dores (URA + SondaIntel + SJC 2024)
            │       ├── Matemática dos Votos (4 cenários + ranking praças)
            │       └── Redes Sociais (6 contas + API pendente)
            ├── Módulo 03 ESTRATÉGIA
            │       ├── Vale do Paraíba (Praça 1 — 50k meta)
            │       ├── Zona Sul Capital (Praça 2 — 130 IURD)
            │       ├── Cinturão Sudoeste (Praça 3 — Embu/Taboão)
            │       └── Jundiaí (bloqueada — monitoramento)
            ├── Módulo 04 EXECUÇÃO
            │       ├── Igrejas Universal (253 IURD — 3 blocos)
            │       ├── Rede Política (líderes + núcleo duro)
            │       └── Agenda & Marcos (kanban + cronograma)
            └── Módulo 05 SEGURANÇA
                    └── Blindagem (vulnerabilidades + CEAP + menções)

5. ELEMENTOS TÉCNICOS OBSERVADOS
Frontend: Next.js/React com roteamento dinâmico via Vercel. URLs amigáveis (/comando/[seção]).
Autenticação: Sistema de login com sessão persistente (botão "Sair" no header).
Componentes recorrentes:

Cards KPI com valor grande + legenda + variação percentual
Gráficos de barras horizontais (ranking)
Tabelas responsivas com colunas ordenáveis
Mapas coropléticos (carregamento assíncrono com estado "Carregando mapa de SP...")
Kanban board com 3 colunas (A fazer / Em andamento / Concluído)
Sistema de filtros por botões togglables
Tabs de navegação interna (Blindagem: 3 abas com badges de contagem)
Badges de prioridade coloridos (CRÍTICA, ALTA, MEDIA, BAIXA)
Modo escuro togglável (ícone lua no canto inferior direito)
Cronômetro regressivo em tempo real (JavaScript client-side)

Dados integrados:

TSE 2022 (votos por seção eleitoral — 5.854 locais georreferenciados)
IBGE Censo 2022 (27.301 setores censitários, 96 distritos PMSP)
Pesquisa SJC 2024 (14.636 respostas reais)
CEAP (cota parlamentar via dados abertos da Câmara)
Meta Graph API (integração pendente)
YouTube Data API v3 (integração pendente)


6. RESUMO EXECUTIVO
O Centro de Comando Milton Vieira 2026 é um sistema sofisticado de inteligência eleitoral que centraliza, em uma única plataforma privada, todos os dados estratégicos necessários para conduzir a campanha de reeleição ao cargo de Deputado Federal. O sistema aplica metodologia militar (Loop OODA, Schwerpunkt) à gestão de campanha, com ênfase em dados reais do TSE e IBGE para substituir estimativas intuitivas por decisões baseadas em evidência. A campanha tem meta de 150.000 votos (alta de 52% sobre 2022) e estrutura suas praças em torno de 253 igrejas IURD distribuídas em 3 blocos territoriais, complementadas por uma rede política em construção liderada pelo filho vereador Milton Vieira Jr.

Dossiê elaborado por: Claude (Anthropic) — análise automatizada de 19 telas capturadas em sessão ao vivo no sistema.
Total de screenshots desta sessão: 18 frames no GIF + histórico das sessões anteriores (~80+ capturas individuais)