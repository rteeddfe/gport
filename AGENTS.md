# AGENTS.md — Rules for AI Coding Agents

Digital marketplace platform skeleton: `frontend/` (Next.js 16) + `backend/`
(NestJS 12) + PostgreSQL (Prisma 7). Read this file before making changes.

## Golden rules

1. Study the existing architecture first; follow it. Do not rewrite working
   structure without a reason.
2. Reuse existing components, services, hooks, and utilities. Do not duplicate
   code.
3. Do not add a library when the existing stack solves the task.
4. Touch only the modules affected by the task. No drive-by refactoring.
5. Explain architectural decisions before large changes.
6. Minimal correct change > clever abstraction.

## Architecture in one screen

```
Component (Server by default)
   ↓ (client interactivity only)
React Query (server state) ──→ services/*.service.ts ──→ lib/api/client.ts ──→ NestJS REST API
Zustand (client-only UI state)                                              ↓
React Hook Form + Zod (forms)                                          Prisma
                                                                             ↓
                                                                       PostgreSQL
```

## Frontend rules (`frontend/`)

- **Server Components by default.** Add `"use client"` only for state, event
  handlers, browser APIs, React Query, Zustand, Framer Motion, forms.
- Server state → React Query (`features/*/hooks/`). Never put server data in
  Zustand. Zustand is only for client-only state (currently `stores/ui-store.ts`,
  `stores/auth-store.ts`).
- All API calls go through `services/*.service.ts`, which use
  `lib/api/client.ts`. Never call `fetch` directly in components.
- Forms → React Hook Form + Zod resolver; schemas live in `schemas/`.
  Add `noValidate` to forms so Zod owns validation.
- UI → shadcn/ui components (`components/ui/`) + Tailwind. Do not hand-roll
  Button/Input/Dialog/etc. Compose classes with `cn()` from `@/lib/utils`.
- Keep components small; split when a component grows past ~200 lines.
- Feature code lives in `features/<domain>/{api,components,hooks,schemas,types}`.
- Do not store tokens in localStorage. The access token lives in memory
  (`stores/auth-store.ts`); a refresh-cookie flow is the planned upgrade.
- Types mirroring API DTOs live in `types/api.ts` (manually maintained until
  OpenAPI code generation is introduced).

## Backend rules (`backend/`)

- Module per domain (`src/<domain>/`): `module.ts`, `controller.ts`,
  `service.ts`, `dto/`. Cross-cutting code in `src/common/` and `src/config/`.
- Every incoming DTO is validated by class-validator via the global
  ValidationPipe (`whitelist`, `forbidNonWhitelisted`, `transform`). Never
  trust client input, even if the frontend validates.
- Database access only through `PrismaService` (`src/database/`).
- Routes are protected by the global `JwtAuthGuard` (mark public routes with
  `@Public()`) and the global `RolesGuard` (restrict with `@Roles(Role.ADMIN)`).
- Keep error responses in the filter-defined shape
  `{ statusCode, message, errors? }` — throw NestJS exceptions or use
  `{ message, errors }` payloads; never leak stack traces.
- Secrets only via environment variables (see `.env.example`). Never commit
  `.env`.
- Prisma: change `prisma/schema.prisma`, then `pnpm prisma migrate dev --name <change>`.
  Do not hand-edit files in `prisma/migrations/`.
- This is Prisma 7: the client is generated to `src/generated/prisma/` (gitignored),
  the CLI reads `prisma.config.ts`, and connections use the `@prisma/adapter-pg`
  driver adapter.

## Workflow for every task

1. Understand the task and inspect existing code.
2. Identify affected modules; reuse what exists.
3. Implement the minimal correct change.
4. Run: `pnpm typecheck && pnpm lint` in the changed app(s).
5. Run relevant tests (`pnpm test`; backend also `pnpm test:e2e`).
6. Fix everything before reporting. List changed files in the summary.

## Commands

| Where        | Verify                            |
| ------------ | --------------------------------- |
| `frontend/`  | `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` |
| `backend/`   | `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, `pnpm build` |

## Forbidden patterns

- `any` without a written justification (strict TypeScript everywhere).
- Direct `fetch` in components; direct SQL outside Prisma.
- Server data in Zustand; duplicated validation rules drift (frontend schemas
  are UX, backend DTO validation is the source of truth).
- `origin: "*"` in CORS; secrets in the frontend bundle or in git.
- Editing generated code (`frontend/.next/`, `backend/src/generated/`).
- New npm packages without checking they are actually needed.

## Testing rules

- Frontend: Jest + RTL. Test user-visible behavior (render, click, submit),
  mock the service layer, not internals. Tests live in `frontend/tests/`.
- Backend: Vitest unit tests next to the code (`*.spec.ts`), E2E in `test/`.
  Mock `PrismaService` in tests that must not touch the database.
- Do not chase 100% coverage; cover regressions and core flows.

## More documentation

`docs/architecture.md`, `docs/frontend.md`, `docs/backend.md`,
`docs/database.md`, `docs/api.md`, `docs/testing.md`, `docs/development.md`,
`docs/deployment.md`.
