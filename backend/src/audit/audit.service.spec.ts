import { AuditService, sanitizeMetadata } from './audit.service.js';

const ACTOR = { id: '00000000-0000-0000-0000-0000000000aa', role: 'SUPER_ADMIN' };

function makeService() {
  const prisma = {
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
  };
  const service = new AuditService(prisma as never);
  return { service, prisma };
}

describe('AuditService (M-AUDIT-1)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates an audit record from the trusted actor context', async () => {
    const { service, prisma } = makeService();
    await service.log({
      actor: { id: ACTOR.id, role: 'SUPER_ADMIN' },
      action: 'integration.updated',
      entityType: 'integration',
      entityId: 'YANDEX',
      metadata: { changedFields: ['clientId'] },
      request: { ipAddress: '203.0.113.9', userAgent: 'agent-1' },
    });
    const arg = prisma.auditLog.create.mock.calls[0][0].data;
    expect(arg.actorUser.connect.id).toBe('00000000-0000-0000-0000-0000000000aa');
    expect(arg.actorRole).toBe('SUPER_ADMIN');
    expect(arg.action).toBe('integration.updated');
    expect(arg.ipAddress).toBe('203.0.113.9');
    expect(arg.userAgent).toBe('agent-1');
    expect(arg.metadata).toEqual({ changedFields: ['clientId'] });
  });

  it('an anonymous actor stores no actorUser connection', async () => {
    const { service, prisma } = makeService();
    await service.log({
      actor: { id: null, role: null },
      action: 'user.access_updated',
      entityType: 'user',
    });
    const arg = prisma.auditLog.create.mock.calls[0][0].data;
    expect(arg.actorUser).toBeUndefined();
    expect(arg.actorRole).toBeNull();
    expect(arg.ipAddress).toBeNull();
    expect(arg.userAgent).toBeNull();
  });

  it('metadata cannot override the trusted actor', async () => {
    const { service, prisma } = makeService();
    await service.log({
      actor: { id: ACTOR.id, role: 'ADMIN' },
      action: 'user.access_updated',
      entityType: 'user',
      entityId: '11111111-1111-1111-1111-111111111111',
      // A spoofed actor inside metadata stays inert: the persisted actor
      // fields come exclusively from the trusted AuditActor.
      metadata: {
        actorUserId: '99999999-9999-9999-9999-999999999999',
        changedFields: [],
      },
    });
    const arg = prisma.auditLog.create.mock.calls[0][0].data;
    expect(arg.actorUser.connect.id).toBe('00000000-0000-0000-0000-0000000000aa');
    expect(arg.actorRole).toBe('ADMIN');
  });

  it('a failed audit write does not throw and does not leak values', async () => {
    const { service, prisma } = makeService();
    prisma.auditLog.create.mockRejectedValue(new Error('db down'));
    await expect(
      service.log({
        actor: ACTOR,
        action: 'integration.updated',
        entityType: 'integration',
        metadata: { changedFields: [] },
      }),
    ).resolves.toBeUndefined();
  });

  describe('metadata sanitization', () => {
    it('drops credential keys at any nesting depth', () => {
      const result = sanitizeMetadata({
        changedFields: ['clientId'],
        nested: {
          password: 'hunter2',
          passwordHash: '$2a$10$hash',
          accessToken: 'at-token',
          refreshToken: 'rt-token',
          jwt: 'eyJ',
          apiKey: 'ak',
        },
        deep: {
          deeper: {
            code: 'oauth-code',
            state: 'oauth-state',
            code_verifier: 'verifier',
            verifier: 'v2',
          },
        },
      });
      expect(result).toEqual({ changedFields: ['clientId'] });
    });

    it('drops integration/encryption/payment credentials entirely', () => {
      const result = sanitizeMetadata({
        clientSecret: 'TEST_SECRET_SHOULD_NEVER_APPEAR',
        INTEGRATIONS_ENCRYPTION_KEY: '6161',
        cookie: 'a=b',
        authorization: 'Bearer x',
        cvv: '123',
        cardNumber: '4111',
        webhookSecret: 'wh',
        safe: 'value',
      });
      expect(result).toEqual({ safe: 'value' });
    });

    it('keeps safe keys — normalized matching is exact, not substring', () => {
      expect(sanitizeMetadata({ changedFields: ['enabled'] })).toEqual({
        changedFields: ['enabled'],
      });
      // secretField is an allowlisted audit shape; the STRING
      // 'clientSecret' as a value is fine — only the KEY is sensitive.
      expect(sanitizeMetadata({ secretField: 'clientSecret', operation: 'set' })).toEqual({
        secretField: 'clientSecret',
        operation: 'set',
      });
    });

    it('caps the key count and string length', () => {
      const wide: Record<string, unknown> = {};
      for (let i = 0; i < 150; i += 1) {
        wide[`field${i}`] = 'x'.repeat(5000);
      }
      const result = sanitizeMetadata(wide);
      expect(Object.keys(result as Record<string, unknown>)).toHaveLength(100);
      const first = Object.values(result as Record<string, unknown>)[0] as string;
      expect(first.length).toBeLessThanOrEqual(2001);
    });
  });

  describe('read API', () => {
    it('findMany paginates newest-first', async () => {
      const { service, prisma } = makeService();
      await service.findMany({ page: 2, limit: 20 });
      const findArgs = prisma.auditLog.findMany.mock.calls[0][0];
      expect(findArgs.orderBy).toEqual({ createdAt: 'desc' });
      expect(findArgs.skip).toBe(20);
      expect(findArgs.take).toBe(20);
      expect(prisma.auditLog.count).toHaveBeenCalled();
    });

    it('enforces limit <= 100', async () => {
      const { service, prisma } = makeService();
      await service.findMany({ limit: 500 });
      expect(prisma.auditLog.findMany.mock.calls[0][0].take).toBe(100);
    });

    it('builds where filters from the validated DTO fields only', async () => {
      const { service, prisma } = makeService();
      await service.findMany({
        action: 'integration.updated',
        entityType: 'integration',
        entityId: 'YANDEX',
        actorUserId: '00000000-0000-0000-0000-0000000000aa',
        dateFrom: '2026-01-01T00:00:00.000Z',
        dateTo: '2026-01-31T23:59:59.000Z',
      });
      const where = prisma.auditLog.findMany.mock.calls[0][0].where;
      expect(where).toMatchObject({
        action: 'integration.updated',
        entityType: 'integration',
        entityId: 'YANDEX',
        actorUserId: '00000000-0000-0000-0000-0000000000aa',
      });
      expect(where.createdAt.gte).toEqual(new Date('2026-01-01T00:00:00.000Z'));
      expect(where.createdAt.lte).toEqual(new Date('2026-01-31T23:59:59.000Z'));
    });
  });
});
