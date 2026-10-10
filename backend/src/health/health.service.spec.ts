import { HealthService, type HealthCheckResult } from './health.service.js';

describe('HealthService', () => {
  const makeService = (queryRaw: () => Promise<unknown>): HealthService =>
    new HealthService({
      $queryRaw: queryRaw,
    } as never);

  it('reports the database as up when the query succeeds', async () => {
    const service = makeService(async () => [{ '?column?': 1 }]);
    const result: HealthCheckResult = await service.check();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
    expect(typeof result.timestamp).toBe('string');
  });

  it('reports the database as down when the query fails', async () => {
    const service = makeService(async () => {
      throw new Error('connection refused');
    });
    const result = await service.check();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('down');
  });
});
