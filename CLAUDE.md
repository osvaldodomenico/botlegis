# LegisBot — Instruções do Projeto

## O que é
Sistema de gestão territorial e projeções políticas para SP (BI Político MV 2026).

## Stack
- **Backend**: NestJS 10 + Prisma 5 + MySQL 8 (porta 8000)
- **Frontend**: Next.js 14 + TailwindCSS + Apple Design System (porta 3000)
- **Infra**: Docker Swarm via EasyPanel
- **Bot**: WhatsApp via webhooks (system-prompt + bot-context)

## Estrutura
```
bot/
├── backend/         # NestJS API
│   ├── src/modules/ # auth, municipios, dashboard, busca, projecoes, importacoes, webhooks, integracoes, territorios, dobradas
│   └── prisma/      # schema.prisma + migrations
├── frontend/        # Next.js 14
│   └── src/app/     # pages: /, /municipios, /territorios, /consultas, /simular, /integracoes, /login
└── docs/            # DESIGN.md (Apple Design System)
```

## ⛔ REGRAS INVIOLÁVEIS

### 1. URLs de Produção — NUNCA inventar
- **Backend API**: `https://automacoes-legisbot.sqcx8c.easypanel.host`
- **Frontend**: `https://legisbot.shiftworks.app.br`
- **`legisbot-api.shiftworks.app.br` NÃO EXISTE** — nunca usar
- `NEXT_PUBLIC_API_URL` é embarcado no build do Next.js. Se errar, dados não carregam.

### 2. Zero Arquivos Locais para Dados
- NUNCA sugerir XLSX, CSV ou dump/restore local
- Dados vivem no banco de produção (`legisbot`) e no BI
- Sincronização = `POST /integracoes/bi/sync-municipios`
- Banco local (`mv2026_db`) é IRRELEVANTE

### 3. VPS — Acesso com Cautela
- VPS novo (EasyPanel OK): `66.179.191.53` | senha: `kBYKfo9tltn4H`
- VPS antigo: `74.208.68.145` — há múltiplos projetos, cuidado redobrado
- Deploy via rsync + docker build — usar skill `/deploy`

### 4. MySQL Produção — Escaping de Senha
A senha contém `!`. NUNCA usar inline no shell. Sempre `--defaults-file`:
```bash
printf '[client]\nuser=root\npassword=Jesus7714@!2469\n' > /tmp/my.cnf
mysql --defaults-file=/tmp/my.cnf legisbot -e "SQL"
rm /tmp/my.cnf
```
Container MySQL: `automacoes_mysql_outros`

### 5. Dockerfile Backend — OpenSSL
Prisma 5.22+ requer OpenSSL no Alpine. OBRIGATÓRIO em ambos stages:
```dockerfile
RUN apk add --no-cache openssl
```

### 6. Arquivos .env
NUNCA editar `.env` ou `.env.local` diretamente. Pedir ao usuário.

## Design System
- Apple Design System (ver `docs/DESIGN.md`)
- Primary: `#0066cc`, ink: `#1d1d1f`, parchment: `#f5f5f7`, tile: `#272729`
- Cards: `border-radius: 18px`, botões pill: `9999px`
- Stat cards: classe `.stat-card`, cards gerais: `.card`

## Banco de Dados
- **Local**: `mysql://root:mv2026@localhost:3306/mv2026_db` (só dev, desatualizado)
- **Produção**: `legisbot` no container `automacoes_mysql_outros`
- Admin: `admin@mv2026.local` / `admin123`
- Auth: campo é `senha` (não `password`) — `POST /auth/login` com `{email, senha}`

## Tipos de Cadastro
Três tipos válidos: `EXTERNO`, `BASE - INSTITUIÇÃO`, `BASE APOIADORES`
- Cada tipo tem grid de colunas diferente na tela Municípios
- Ao trocar tipo no filtro, limpar todos os outros filtros

## Deploy
Usar skill `/deploy` que encapsula todo o fluxo correto.
- Frontend service: `automacoes_legisbot_frontend`
- Backend service: `automacoes_legisbot`
- Build frontend SEMPRE com `--build-arg NEXT_PUBLIC_API_URL=https://automacoes-legisbot.sqcx8c.easypanel.host`

## Migrations
Usar skill `/migration` para criar e aplicar migrations Prisma.
- Nunca rodar `prisma migrate deploy` no Dockerfile
- Aplicar manualmente via docker exec com `--defaults-file`

## Dev Local
- Node: `/opt/homebrew/opt/node@22/bin/node`
- Backend: `cd /Users/domenico/mv2026-backend && npm run build && node dist/main`
- Frontend: `cd /Users/domenico/mv2026-frontend && npm run dev`
- Projeto original no HD externo — copiar para disco local antes de rodar

## Observações
- Após mudanças significativas, atualizar Obsidian `05 - Historico de Mudancas.md`
- Vault Obsidian: `/Users/domenico/Library/Mobile Documents/com~apple~CloudDocs/shiftworks_brian/shiftworks_brain/01 - Projetos Ativos/LegisBot/`
