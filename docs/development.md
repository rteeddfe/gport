# Development workflow

## Daily setup

```bash
# terminal 1 — database (choose one)
docker compose up -d
cd backend && node scripts/dev-db.mjs     # no-Docker option

# terminal 2 — backend
cd backend && pnpm start:dev

# terminal 3 — frontend
cd frontend && pnpm dev
```

First run: `cp .env.example .env` (backend), `cp .env.example .env.local`
(frontend), then `pnpm db:migrate:deploy && pnpm db:seed`.

## Workflow for a task

1. Understand the task; find affected modules.
2. Reuse existing services/components/hooks; avoid new abstractions.
3. Implement the minimal change.
4. Verify in the changed app(s):

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test          # backend also: pnpm test:e2e
   pnpm build         # before considering the task done
   ```

5. Fix findings, then summarize changed files.

## Adding an API endpoint (full path)

1. Backend: DTO → service → controller (guards: `@Public()`/`@Roles()`),
   register module if new (see docs/backend.md recipe).
2. Check Swagger at http://localhost:3001/api/docs.
3. Frontend: add a method in `services/<domain>.service.ts`, mirror the DTO
   type in `types/api.ts`, add a React Query hook in
   `features/<domain>/hooks/`, consume from a component.
4. Tests: backend spec for the service; frontend test if the UI has logic.

## Adding a UI page

1. Route group: `(public)` / `(auth)` / `(dashboard)` under `app/`.
2. Server Component by default; fetch server-side via services, or add a
   client component with React Query hooks for interactive parts.
3. Reuse `components/shared/*` (EmptyState, LoadingState, ErrorState) and
   `Container`.
4. If it needs auth later, wire it into the `(dashboard)` group with a
   session check.

## Environment variables

- `backend/.env` — PORT, DATABASE_URL, JWT_SECRET, CORS_ORIGIN (see
  `backend/.env.example`).
- `frontend/.env.local` — NEXT_PUBLIC_API_URL (see `frontend/.env.example`).
- `.env*` files are gitignored; `.env.example` files are the contract.

## Common issues

| Symptom | Cause / fix |
| --- | --- |
| Backend exits with env validation error | `JWT_SECRET`/`DATABASE_URL` missing — create `.env` |
| `database: "down"` in health | DB not running — start docker compose or dev-db script |
| CORS errors in the browser console | Add the frontend origin to `CORS_ORIGIN` (comma-separated) and restart backend |
| Prisma types missing after clean install | `pnpm install` runs `prisma generate` (postinstall); rerun manually if needed |
| 401 on every request after restart | Access token lives in memory by design — sign in again (refresh flow is future work) |
