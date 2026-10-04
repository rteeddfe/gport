# GPort — Online Store for Digital Gaming Goods

Technical foundation of an **ordinary online store for digital gaming goods
and services**. The store itself is the seller of every item in the catalog —
this is **not a marketplace**: there are no third-party sellers, seller
accounts, storefronts, commissions or seller payouts anywhere in the business
model. (The string `marketplace` in a few technical identifiers — the seed
login `admin@marketplace.local` and the local database name — is a leftover
artifact of the early skeleton name and means nothing about the business
model.)

Status of business features:

- **Implemented:** catalog (categories, products with attributes), cart
  (guest + user, merge on login), promo codes, search suggestions.
- **Planned — domain model and API NOT approved yet:** orders, payments /
  acquiring, fulfillment, top-up services (Steam etc.), advanced roles.

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
pnpm db:seed                 # 1 admin, 2 categories, 3 products, 1 promo code
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
| http://localhost:3000            | Home page + API/Backend/Database status: OK (the page title still shows the legacy placeholder text "Digital Marketplace — Frontend is running" — frontend code, not yet rebranded) |
| http://localhost:3000/products   | Seeded product list (Server Component → REST → DB) |
| http://localhost:3001/api/health | `{"status":"ok","database":"up",...}`     |
| http://localhost:3001/api/docs   | Swagger UI                                |

Seed accounts (development-only credentials, never use them in production):

- `admin@marketplace.local` / `admin1234` — role SUPER_ADMIN (`marketplace`
  in the address is a technical artifact of the early skeleton name)
- `admin@gport.local` / `admin1234` — role ADMIN

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
Full map with filters and response shapes: [docs/api.md](docs/api.md).

```
GET    /api/health              # liveness + database status
GET    /api/categories
GET    /api/products            # catalog: ?page=&limit=&search=&categorySlug=&
                                #   region=&platform=&genre=&priceMin=&priceMax=&sort=
GET    /api/products/:slug      # product card + related
GET    /api/search/suggest?q=
GET    /api/cart                # guest (cart_token cookie) or user (JWT)
POST   /api/cart/items          # { productId, quantity? }
PATCH  /api/cart/items/:itemId  # { quantity }
DELETE /api/cart/items/:itemId
DELETE /api/cart                # clear
POST   /api/cart/promo          # { code }
DELETE /api/cart/promo
POST   /api/auth/register       # { email, password, name? } -> { accessToken, user }
POST   /api/auth/login          # also merges the guest cart into the user
POST   /api/auth/logout
GET    /api/auth/me             # JWT required
# ADMIN (JWT):
GET|POST|PATCH|DELETE /api/admin/products[...]
GET|POST|PATCH|DELETE /api/admin/promo-codes[...]
```

Orders, payments and top-up endpoints are **not implemented** — their domain
model is not designed yet (see docs/business/ and docs/api.md).

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
- [docs/business/](docs/business/README.md) — business processes (purchase flows): requirements, one document per flow

[AGENTS.md](AGENTS.md) contains the project rules for AI coding agents.
