import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  it('returns the health check payload', async () => {
    const healthService = {
      check: () =>
        Promise.resolve({
          status: 'ok' as const,
          database: 'up' as const,
          timestamp: '2026-01-01T00:00:00.000Z',
        }),
    } as HealthService;
    const controller = new HealthController(healthService);
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
  });
});
