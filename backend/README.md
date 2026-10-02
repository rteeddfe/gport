# Backend — Digital Marketplace API

NestJS 12 (ESM) + PostgreSQL + Prisma 7 + JWT auth + Swagger.

See the root [README](../README.md) for setup, [docs/backend.md](../docs/backend.md)
for conventions and [docs/api.md](../docs/api.md) for the API surface.
AI agents: read the root [AGENTS.md](../AGENTS.md).

```bash
pnpm install                 # runs prisma generate
cp .env.example .env
pnpm dev:db                  # optional: user-space PostgreSQL (no Docker), port 55432
pnpm db:migrate:deploy && pnpm db:seed
pnpm start:dev               # http://localhost:3001  (Swagger: /api/docs)
pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm build
```
