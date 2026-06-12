# LegisBot Campo — App Mobile Flutter Web + PWA

**Data:** 2026-06-12
**Status:** Aprovado pelo usuário (Opção A — monorepo)

## Objetivo

App de campo enxuto para coordenadores e equipe consultarem dados políticos no
celular. Distribuído **via link** com opção de instalação como **PWA**. O mesmo
codebase Flutter compila para APK Android no futuro, sem reescrita.

**Restrição inviolável:** a versão web desktop (`frontend/`, Next.js 14) não é
alterada em nenhum arquivo.

## Decisões tomadas (com o usuário)

| Decisão | Escolha |
|---|---|
| Propósito | App de campo enxuto (não réplica do sistema completo) |
| Distribuição | Link + PWA (sem lojas por enquanto) |
| Tecnologia | Flutter Web + PWA (mantém caminho para APK nativo) |
| Escopo v1 | Busca de municípios + ficha, Dashboard resumido, Territórios |
| Fora do v1 | Sentinela, Dobradas, Relatórios, Importações, edição de dados |
| Organização | Monorepo: pasta `mobile/` ao lado de `backend/` e `frontend/` |

## Arquitetura

```
bot/
├── backend/    # NestJS — única mudança: CORS aceita lista de origens
├── frontend/   # Next.js — INTOCADO
└── mobile/     # NOVO — Flutter 3.x (web target, PWA habilitado)
    ├── lib/
    │   ├── main.dart
    │   ├── theme/            # Apple Design System em Material 3
    │   ├── api/              # cliente HTTP + modelos
    │   ├── auth/             # login JWT + storage do token
    │   └── screens/          # login, dashboard, busca, ficha, territorios
    ├── web/                  # manifest.json, ícones, index.html
    └── Dockerfile            # build Flutter → nginx estático
```

### Backend — única mudança

`backend/src/main.ts`: `origin` passa de string única para lista derivada de
`FRONTEND_URL` (separada por vírgula) — ex.:
`https://legisbot.shiftworks.app.br,https://app.legisbot.shiftworks.app.br`.
Compatível com o valor atual (uma origem só continua funcionando). Nenhum
endpoint novo; nenhuma migration.

### API consumida (tudo já existe)

| Tela | Endpoint |
|---|---|
| Login | `POST /auth/login` com `{email, senha}` → JWT |
| Dashboard | `GET /dashboard` (stats) e `GET /ranking` (top municípios) |
| Busca | `GET /busca?q=...&limit=...` e `GET /filtros/opcoes` |
| Ficha município | `GET /municipios/:id` |
| Territórios (stats) | `GET /stats/regiao/:regiao`, `GET /stats/bloco/:bloco`, `GET /stats/coordenador/:nome` |
| Territórios (drill-down divisão) | `GET /municipios?divisao_regional=...` (filtro existente no DTO) |

Todas as rotas exceto `/auth/login` exigem JWT (`JwtAuthGuard`) — o cliente HTTP
do app envia `Authorization: Bearer <token>` em todas as chamadas.

Base URL embarcada no build: `https://automacoes-legisbot.sqcx8c.easypanel.host`
(produção). Em dev: `http://localhost:8000` via `--dart-define=API_URL=...`.

### Telas v1

0. **Splash screen** — exibida durante o carregamento inicial do Flutter Web
   (importante dado o payload de ~1,5 MB no primeiro acesso): logo "LegisBot
   Campo" centralizado sobre fundo primary `#0066cc`, implementada no
   `web/index.html` (HTML/CSS puro, aparece antes do engine Flutter carregar)
   + `flutter_native_splash` para manter consistência quando compilar APK.
1. **Login** — email + senha, persiste JWT em `localStorage` (web) /
   `shared_preferences`. Sem token → redireciona para login.
   Checkbox **"Lembrar senha"**: quando marcado, salva email e senha localmente
   no dispositivo (`shared_preferences`) e pré-preenche os campos no próximo
   acesso; a sessão (JWT) também é persistida, então o usuário só refaz login
   quando o token expira — e aí os campos já vêm preenchidos. Trade-off de
   segurança aceito: credenciais ficam apenas no armazenamento local do
   aparelho do usuário, nunca trafegam além do `POST /auth/login`.
2. **Dashboard** — stat cards (total projeções, municípios, votos 2022 oficial
   98.557) + ranking top 10. Pull-to-refresh.
3. **Busca** — campo de busca com debounce; resultados em cards; tap abre ficha.
4. **Ficha do município** — projeções por tipo (EXTERNO, BASE - INSTITUIÇÃO,
   BASE APOIADORES), coordenador, região, bloco, divisão regional, votos 2022.
5. **Territórios** — drill-down: região → divisão → lista de municípios → ficha.

Navegação: `go_router` com bottom navigation (Dashboard, Busca, Territórios).
Estado: `Provider` (simples, suficiente para app de leitura).

### Design System

Material 3 com tokens do Apple Design System (`docs/DESIGN.md`):
primary `#0066cc`, ink `#1d1d1f`, parchment `#f5f5f7`, tile `#272729`,
cards `border-radius: 18px`, botões pill `9999px`. Fonte: system font stack.

### PWA

- `web/manifest.json`: nome "LegisBot Campo", `theme_color #0066cc`,
  `display: standalone`, ícones 192/512.
- Service worker padrão do Flutter (cache do app shell; dados sempre da rede).
- Sem modo offline de dados no v1.

### Deploy

- Novo serviço EasyPanel `automacoes_legisbot_mobile` no VPS 66.179.191.53.
- `mobile/Dockerfile` multi-stage: imagem Flutter → `flutter build web
  --release` → nginx alpine servindo `/build/web`.
- Subdomínio: `app.legisbot.shiftworks.app.br` (router Traefik no EasyPanel).
- Fluxo: rsync `mobile/` → build na VPS → `docker service update` (mesmo padrão
  da skill `/deploy`).
- **Entregável adicional:** estender a skill `/deploy` com o alvo `mobile`.

## Tratamento de erros

- 401 → limpa token e volta ao login.
- 5xx → mensagem "Erro no servidor, tente novamente" + botão tentar de novo.
- Falha de rede → banner "Sem conexão" + botão tentar de novo.
- Timeout de 15s nas chamadas.

## Testes

- Unit: parsing dos modelos da API e lógica de auth (token expirado).
- Widget: telas de login e busca com API mockada.
- Verificação manual: build web local (`flutter run -d chrome`) contra o
  backend de produção antes do deploy.

## Fora de escopo (v1)

- Sentinela, Dobradas, Relatórios, edição/escrita de dados.
- Push notifications, modo offline de dados, publicação em lojas.
- iOS (vem de graça quando compilar nativo no futuro).

## Riscos

- **Carregamento inicial Flutter Web** (~1,5 MB): mitigado por cache do service
  worker após o primeiro acesso; usar renderer HTML (mais leve que CanvasKit) se
  o tempo de primeiro paint ficar ruim em 4G.
- **CORS**: testar a origem nova em produção antes de divulgar o link.
- **DNS**: criar o registro `app.legisbot.shiftworks.app.br` na Cloudflare
  apontando para o VPS (mesmo padrão do frontend).
