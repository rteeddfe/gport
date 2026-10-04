# Testing

Goal of the skeleton: prove the test infrastructure works and set the patterns.
Coverage targets stay modest — cover regressions and core flows, not lines.

## Frontend — Jest + React Testing Library

- Config: `frontend/jest.config.ts` (uses `next/jest`), setup `jest.setup.ts`
  (loads `@testing-library/jest-dom`), environment jsdom.
- Tests live in `frontend/tests/` (`components/`, `features/`).
- Commands: `pnpm test`, `pnpm test:watch`, `pnpm test:coverage`.

Existing tests as patterns:

| Test | Demonstrates |
| --- | --- |
| `tests/components/button.test.tsx` | rendering a shadcn/ui component, user-event click, variant class |
| `tests/components/error-state.test.tsx` | accessible roles (`role="alert"`) |
| `tests/features/sign-in-form.test.tsx` | React Hook Form + Zod validation messages, mocked service, `QueryClientProvider` wrapper |
| `tests/features/use-products.test.tsx` | React Query hook via `renderHook`, success + error paths |

Rules of thumb: test user-visible behavior; mock the **service layer** (never
`fetch` directly); wrap React Query consumers in a fresh `QueryClient`;
components using routers need a `next/navigation` mock.

## Backend — Vitest + supertest

- Unit specs sit next to the code (`*.spec.ts`) and run with `pnpm test`
  (config `backend/vitest.config.ts`, globals enabled).
- E2E specs live in `backend/test/` and run with `pnpm test:e2e`
  (`vitest.config.e2e.ts`): the full AppModule boots with `PrismaService`
  overridden by a mock, then real HTTP requests hit the app through supertest.
- Existing tests: unit specs next to the code — `health.service.spec.ts`,
  `health.controller.spec.ts`, `products.service.spec.ts`, `cart.service.spec.ts`,
  `promo-codes.service.spec.ts` (pure discount/validation helpers covered
  there); e2e `test/app.e2e-spec.ts` (`GET /api/health`).

Rules of thumb: mock `PrismaService` for tests that must not touch the
database; keep e2e independent of external services; seed-dependent e2e tests
belong behind a running database (documented, not default).

## CI order (both apps)

```bash
pnpm typecheck && pnpm lint && pnpm test
# backend additionally: pnpm test:e2e && pnpm build
# frontend additionally: pnpm build
```

`pnpm build` is part of verification: it is what Vercel/PaaS will run.
