import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'e2e-test-secret-0123456789abcdef';
    process.env.DATABASE_URL ??= 'postgresql://localhost:5432/e2e_placeholder';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({
        $queryRaw: async () => [{ '?column?': 1 }],
        // TrafficService reads the ban list + security settings on the
        // first request through the global traffic middleware.
        blockedIp: { findMany: async () => [] },
        securitySettings: { findUnique: async () => null },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('GET /api/health returns ok with database up', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.database).toBe('up');
  });

  afterAll(async () => {
    await app.close();
  });
});
