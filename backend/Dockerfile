# Backend production image (used by docker-compose and any Docker-capable PaaS).
FROM node:24-alpine

RUN npm i -g pnpm@12.8.1

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.build.json nest-cli.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
COPY test ./test

RUN pnpm install --frozen-lockfile && pnpm build

ENV NODE_ENV=production
EXPOSE 3001

# Apply pending migrations, then start the compiled app.
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main.js"]
