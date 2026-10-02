import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7 does not read the datasource url from schema.prisma anymore.
// The CLI (migrate, seed) loads DATABASE_URL here; the NestJS runtime loads it
// via @nestjs/config. A fallback keeps `prisma generate` usable without env.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/marketplace',
  },
});
