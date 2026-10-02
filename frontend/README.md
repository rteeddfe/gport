# Frontend — Digital Marketplace

Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui +
TanStack Query + Zustand + React Hook Form/Zod + Framer Motion.

See the root [README](../README.md) for setup and [docs/frontend.md](../docs/frontend.md)
for structure and conventions. AI agents: read the root [AGENTS.md](../AGENTS.md).

```bash
pnpm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL
pnpm dev                     # http://localhost:3000
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
