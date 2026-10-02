# References

Compact knowledge base: official documentation for the stack plus
project-specific usage notes. Priority when in doubt:
**official docs > this repo's docs/ > random articles.**

## Official documentation

- Next.js 16 (App Router): https://nextjs.org/docs
- React 19: https://react.dev/learn
- TypeScript: https://www.typescriptlang.org/docs/
- Tailwind CSS 4: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com/docs
- Framer Motion: https://motion.dev/docs/react (framer-motion)
- Zod 4: https://zod.dev
- React Hook Form: https://react-hook-form.com/docs
- TanStack Query 5: https://tanstack.com/query/latest/docs
- Zustand: https://zustand.docs.pmnd.rs
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro/
- Jest: https://jestjs.io/docs/getting-started
- NestJS: https://docs.nestjs.com
- Prisma ORM: https://www.prisma.io/docs
- PostgreSQL: https://www.postgresql.org/docs/

## Project-specific notes

- **Prisma 7 migration guide** (driver adapters, `prisma.config.ts`,
  `prisma-client` generator, migrate/seed behavior changes):
  https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7
  — in this repo: `backend/prisma.config.ts`, `backend/src/database/prisma.service.ts`,
  client generated to `backend/src/generated/prisma/`.
- **NestJS 12** is ESM-first: imports use `.js` extensions, `main.ts` uses
  top-level `await`, tests run on Vitest, linting on oxlint.
  Guard recipes here: `backend/src/common/guards/`.
- **Next.js 16 agent docs** are bundled with the package:
  `frontend/node_modules/next/dist/docs/` (see `frontend/AGENTS.md`).
- **shadcn/ui registry**: components were added from the Radix "new-york"
  registry (v2 CLI); `components.json` is the source of truth.
- **OpenAPI → TypeScript types** (planned replacement for manual mirrors in
  `frontend/types/api.ts`): https://openapi-ts.dev
