# BI POLÍTICO MV 2026

Sistema operacional político local para gestão territorial, projeções e dashboard estratégico.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js + NestJS + Prisma ORM |
| Frontend | Next.js 14 + TailwindCSS (Apple Design) |
| Banco | MySQL 8 |
| Cache | Redis 7 |
| Infra | Docker Compose |

## Estrutura do Projeto

```
/backend        → API REST (NestJS)
/frontend       → Painel administrativo (Next.js)
/database       → SQL de inicialização
/importadores   → Scripts auxiliares
/uploads        → Arquivos XLSX enviados
/docs           → Documentação e design system
/docker         → Configurações Docker
```

## Pré-requisitos

- Node.js ≥ 20
- MySQL 8 (local ou via Docker)
- npm ≥ 9

## Setup Local (sem Docker)

### 1. Clone e configure

```bash
# Copiar variáveis de ambiente
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### 2. Configure o banco

Crie o banco MySQL:
```sql
CREATE DATABASE mv2026_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Atualize `backend/.env`:
```
DATABASE_URL=mysql://root:SUASENHA@localhost:3306/mv2026_db
JWT_SECRET=mv2026-jwt-secret
JWT_EXPIRES_IN=7d
PORT=8000
```

### 3. Backend

```bash
cd backend
npm install

# Gerar cliente Prisma
npx prisma generate

# Executar migrations
npx prisma migrate dev

# Popular banco com usuário admin
npx ts-node prisma/seed.ts

# Iniciar em desenvolvimento
npm run start:dev
```

Backend disponível em: http://localhost:8000

### 4. Frontend

```bash
cd frontend
npm install

# Iniciar em desenvolvimento
npm run dev
```

Frontend disponível em: http://localhost:3000

### 5. Credenciais padrão

| Campo | Valor |
|-------|-------|
| E-mail | admin@mv2026.local |
| Senha | admin123 |

## Setup com Docker Compose

### Infraestrutura (MySQL + Redis + Adminer)

```bash
# Subir apenas banco e serviços de apoio
docker compose -f docker-compose.dev.yml up -d

# Verificar status
docker compose -f docker-compose.dev.yml ps
```

Serviços disponíveis:
- MySQL: localhost:3306
- Redis: localhost:6379
- Adminer: http://localhost:8080

Para acessar o Adminer:
- Servidor: `mysql`
- Usuário: `mv2026_user`
- Senha: `mv2026_pass`
- Banco: `mv2026_db`

### Stack completa (app + infra)

```bash
# Build e subir tudo
docker compose up --build -d

# Ver logs
docker compose logs -f backend
docker compose logs -f frontend
```

Portas:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Adminer: http://localhost:8080
- MySQL: localhost:3306

## APIs REST

### Autenticação

```bash
POST /auth/login
{ "email": "admin@mv2026.local", "senha": "admin123" }
# → { access_token, user }
```

### Municípios

```bash
GET    /municipios?page=1&limit=20&nome=&regiao=&bloco=
GET    /municipios/:id
POST   /municipios
PUT    /municipios/:id
DELETE /municipios/:id
```

### Projeções

```bash
GET /projecoes?page=1&regiao=
PUT /projecoes/:id           # { projecao_votos, observacoes }
GET /projecoes/:id/historico # Auditoria de alterações
```

### Dashboard

```bash
GET /dashboard  # Stats gerais + por região + top 10
GET /ranking    # Ranking paginado por projeção
```

### Importações

```bash
POST /importacoes/upload  # multipart/form-data, field: "file"
GET  /importacoes         # Histórico de importações
```

## Importar Planilha XLSX

1. Acesse http://localhost:3000
2. Navegue para **Importador** no menu lateral
3. Arraste o arquivo `.xlsx` ou clique para selecionar
4. Aguarde o processamento
5. Veja o resumo: municípios importados, erros, status

O importador processa apenas a aba **"GERAL ATUALIZADO MV"**.

Colunas mapeadas:
- BLOCO, REGIÃO, REGIÕES RM/RA, MESORREGIÃO, MICRORREGIÕES GEOGRÁFICA
- DIVISÃO REGIONAL, MUNICIPIO, PROJEÇÃO
- COORDENAÇÃO, LIDERANÇA, FUNÇÃO CARGO
- PROJEÇÃO 2, COORD/LIDERNÇA, FUNÇÃO CARGO2
- PROJEÇÃO APOIO IURD, PROJEÇÃO BASE
- ELEITORES 22, VALIDOS, % MV, VOTO22, % PERDA

## Troubleshooting

### Backend não conecta ao banco

Verifique `backend/.env`:
```
DATABASE_URL=mysql://root:SENHA@localhost:3306/mv2026_db
```

Teste a conexão:
```bash
mysql -u root -p mv2026_db -e "SELECT 1"
```

### Erro "Cannot find module prisma/client"

```bash
cd backend
npx prisma generate
```

### Frontend não conecta ao backend

Verifique `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Porta já em uso

```bash
# Matar processo na porta 8000
lsof -ti:8000 | xargs kill -9

# Matar processo na porta 3000
lsof -ti:3000 | xargs kill -9
```

### Reset completo do banco

```bash
cd backend
npx prisma migrate reset
npx ts-node prisma/seed.ts
```

## Roadmap Futuro

- [ ] BI externo (Power BI / Metabase)
- [ ] WhatsApp Bot integrado
- [ ] IA política (análise de tendências)
- [ ] Multiusuário com permissões
- [ ] Deploy cloud (AWS/GCP)
- [ ] Redis cache para dashboard
- [ ] Integração APIs TSE externas
- [ ] Relatórios PDF

## Design

O frontend segue o **Apple Design System** (`docs/DESIGN.md`):
- Primary: `#0066cc`
- Tipografia: system-ui / SF Pro (17px body)
- Cards: `border-radius: 18px`
- Botões: pill-shaped (`border-radius: 9999px`)
