# Digital Marketplace — Platform Skeleton

Technical foundation for a digital-goods marketplace platform. This repository
contains the **architecture skeleton only**: frontend + backend + database +
API + tests + deployment setup. Business features (cart, payments, file
delivery, seller system, etc.) are built on top of this base.

```
Next.js (frontend)  --REST/JSON-->  NestJS (backend)  --Prisma-->  PostgreSQL
```

## Stack

| Layer     | Technology                                                                 |
| --------- | -------------------------------------------------------------------------- |
| Frontend  | Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 4, shadcn/ui, TanStack Query 5, Zustand 5, React Hook Form + Zod 4, Framer Motion, Jest + React Testing Library |
| Backend   | NestJS 12 (ESM), TypeScript (strict), REST API, Swagger/OpenAPI, Passport JWT, class-validator, Vitest, oxlint |
| Database  | PostgreSQL, Prisma ORM 7 (driver adapter `@prisma/adapter-pg`), migrations, seed |
| Infra     | Docker Compose (PostgreSQL + optional backend container), pnpm             |

## Repository layout

```
├── frontend/          # Next.js app (App Router, feature-based structure)
├── backend/           # NestJS API (module per domain)
├── docs/              # Developer documentation (start with docs/architecture.md)
├── docker-compose.yml # PostgreSQL + optional backend container
├── AGENTS.md          # Rules for AI coding agents
└── README.md
```

## Requirements

- Node.js >= 22 (tested with 24)
- pnpm 12 (`corepack enable` or `npm i -g pnpm`)
- Docker Desktop **or** nothing — see “Local database” below

## Quick start

### 1. Database

Option A — Docker:

```bash
docker compose up -d          # PostgreSQL on localhost:55432
```

Option B — no Docker (Windows/macOS/Linux, no admin rights):

```bash
cd backend
node scripts/dev-db.mjs       # user-space PostgreSQL on localhost:55432
```

### 2. Backend

```bash
cd backend
cp .env.example .env          # defaults match docker-compose / dev-db (port 55432)
pnpm install                 # runs `prisma generate` automatically
pnpm db:migrate:deploy       # apply migrations
pnpm db:seed                 # 1 user, 2 categories, 3 products
pnpm start:dev               # http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:3001/api
pnpm install
pnpm dev                     # http://localhost:3000
```

### 4. Verify

| URL                              | Expected                                  |
| -------------------------------- | ----------------------------------------- |
| http://localhost:3000            | “Digital Marketplace — Frontend is running” + API/Backend/Database status: OK |
| http://localhost:3000/products   | Seeded product list (Server Component → REST → DB) |
| http://localhost:3001/api/health | `{"status":"ok","database":"up",...}`     |
| http://localhost:3001/api/docs   | Swagger UI                                |

Seed accounts: `admin@marketplace.local` / `admin1234` (role ADMIN).

## Commands

### Backend (`cd backend`)

| Command                 | Action                          |
| ----------------------- | ------------------------------- |
| `pnpm start:dev`        | Dev server with watch (port 3001) |
| `pnpm build`            | Production build (`dist/`)      |
| `pnpm start:prod`       | Run production build            |
| `pnpm lint`             | oxlint (type-aware)             |
| `pnpm typecheck`        | `tsc --noEmit`                  |
| `pnpm test`             | Unit tests (Vitest)             |
| `pnpm test:e2e`         | E2E tests (supertest)           |
| `pnpm format`           | Prettier                        |
| `pnpm db:migrate:dev`   | Create/apply dev migrations     |
| `pnpm db:migrate:deploy`| Apply migrations (CI/production)|
| `pnpm db:seed`          | Seed test data                  |

### Frontend (`cd frontend`)

| Command             | Action                          |
| ------------------- | ------------------------------- |
| `pnpm dev`          | Dev server (port 3000)          |
| `pnpm build`        | Production build                |
| `pnpm lint`         | ESLint                          |
| `pnpm typecheck`    | `tsc --noEmit`                  |
| `pnpm test`         | Jest + React Testing Library    |
| `pnpm format`       | Prettier                        |

## API overview

Base URL: `http://localhost:3001/api` (interactive docs: `/api/docs`).

```
GET    /api/health              # liveness + database status
GET    /api/products            # paginated list (?page=&limit=&status=&search=)
GET    /api/products/:id
POST   /api/products            # ADMIN (JWT)
PATCH  /api/products/:id        # ADMIN (JWT)
DELETE /api/products/:id        # ADMIN (JWT)
GET    /api/categories
POST   /api/auth/register       # { email, password, name? } -> { accessToken, user }
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me             # JWT required
```

Errors use one predictable shape:

```json
{ "statusCode": 400, "message": "Validation failed", "errors": { "email": ["email must be an email"] } }
```

## Ports

| Service   | Port |
| --------- | ---- |
| Frontend  | 3000 |
| Backend   | 3001 |
| PostgreSQL| 55432 (host) / 5432 (inside Docker network) |

## Deployment

Frontend, backend and database are deployed independently — see
[docs/deployment.md](docs/deployment.md) for the full runbook (Neon/Supabase
PostgreSQL → Render/Railway backend → Vercel frontend → CORS → health checks).

## Documentation

- [docs/architecture.md](docs/architecture.md) — system overview, request/data flow
- [docs/frontend.md](docs/frontend.md) — structure, Server/Client Components, state rules
- [docs/backend.md](docs/backend.md) — modules, DTO validation, auth, error format
- [docs/database.md](docs/database.md) — schema, migrations, seed, Prisma 7 notes
- [docs/api.md](docs/api.md) — REST conventions, auth, pagination, error contract
- [docs/testing.md](docs/testing.md) — what runs where, how to write tests
- [docs/development.md](docs/development.md) — workflow for day-to-day tasks
- [docs/deployment.md](docs/deployment.md) — production deployment runbook
- [docs/references.md](docs/references.md) — official documentation links

[AGENTS.md](AGENTS.md) contains the project rules for AI coding agents.
