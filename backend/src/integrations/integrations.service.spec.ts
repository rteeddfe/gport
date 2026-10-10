import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntegrationsService } from './integrations.service.js';
import type { IntegrationSecretService } from './integration-secret.service.js';

describe('IntegrationsService (M-INTEGRATIONS-1)', () => {
  const prisma = {
    integration: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  // The API layer must never decrypt: the default mock explodes on use.
  const secretService = {
    encrypt: vi.fn((value: string) => `v1.encrypted-${Buffer.from(value).toString('base64url')}`),
    decrypt: vi.fn(() => {
      throw new Error('decrypt must never be called by the API layer');
    }),
  };
  const config = new ConfigService({
    oauth: {
      yandex: { redirectUri: 'https://api.test/api/auth/oauth/yandex/callback' },
      vk: { redirectUri: 'https://api.test/api/auth/oauth/vk/callback' },
    },
  });

  let service: IntegrationsService;

  const AUDIT = {
    actor: { id: '00000000-0000-0000-0000-0000000000aa', role: 'SUPER_ADMIN' },
    request: { ipAddress: '127.0.0.1', userAgent: 'vitest' },
  };
  const auditService = {
    log: vi.fn(async () => {}),
    logInTransaction: vi.fn(async () => {}),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.integration.findMany.mockResolvedValue([]);
    prisma.integration.findUnique.mockResolvedValue(null);
    prisma.integration.deleteMany.mockResolvedValue({ count: 1 });
    prisma.$transaction = vi.fn(async (work: (tx: unknown) => unknown) =>
      work(prisma as never),
    );
    service = new IntegrationsService(
      prisma as never,
      secretService as unknown as IntegrationSecretService,
      config as never,
      auditService as never,
    );
  });

  const row = (overrides: Record<string, unknown> = {}) => ({
    id: '11111111-1111-4111-8111-111111111111',
    provider: 'YANDEX',
    type: 'OAUTH',
    enabled: false,
    config: {},
    secrets: {},
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  });

  describe('GET', () => {
    it('lists every registered provider, defaulting rows that do not exist', async () => {
      const views = await service.list();
      expect(views.map((view) => view.provider)).toEqual(['YANDEX', 'VK']);
      expect(views[0]).toMatchObject({
        enabled: false,
        configured: false,
        secretsConfigured: { clientSecret: false },
      });
    });

    it('never returns a secret — only presence flags and config values', async () => {
      prisma.integration.findUnique.mockResolvedValue(
        row({
          enabled: true,
          config: { clientId: 'cid-1', redirectUri: 'https://api.test/api/auth/oauth/yandex/callback' },
          secrets: { clientSecret: 'v1.iv.tag.ciphertext' },
        }),
      );
      const view = await service.find('yandex');
      expect(view.config).toEqual({
        clientId: 'cid-1',
        redirectUri: 'https://api.test/api/auth/oauth/yandex/callback',
      });
      expect(view.secretsConfigured).toEqual({ clientSecret: true });
      expect(view.configured).toBe(true);
      expect(JSON.stringify(view)).not.toContain('ciphertext');
      // No string value under any *Secret key anywhere in the payload.
      expect(JSON.stringify(view)).not.toMatch(/clientSecret":"[^"]/);
      expect(secretService.decrypt).not.toHaveBeenCalled();
    });

    it('an unknown provider is rejected', async () => {
      await expect(service.find('t-bank')).rejects.toThrow(BadRequestException);
    });

    it('the view always carries every registry config field (empty = not set)', async () => {
      prisma.integration.findUnique.mockResolvedValue(null);
      const view = await service.find('vk');
      expect(view.config).toEqual({ clientId: '', redirectUri: '' });
      expect(view.configured).toBe(false);
    });

    it('VK counts as configured without a client secret; Yandex requires it', async () => {
      prisma.integration.findUnique.mockImplementation((({ where }) =>
        where.provider === 'VK'
          ? row({
              provider: 'VK',
              config: { clientId: 'cid', redirectUri: 'https://api.test/api/auth/oauth/vk/callback' },
              secrets: {},
            })
          : row({
              config: { clientId: 'cid-1', redirectUri: 'https://api.test/api/auth/oauth/yandex/callback' },
              secrets: {},
            })) as never);
      const vk = await service.find('vk');
      expect(vk.configured).toBe(true);
      expect(vk.secretsConfigured).toEqual({ clientSecret: false });
      const yandex = await service.find('yandex');
      expect(yandex.configured).toBe(false);
    });
  });

  describe('PUT', () => {
    it('stores non-secret config in plaintext fields and encrypts secrets', async () => {
      prisma.integration.upsert.mockImplementation((args: {
        create: { config: unknown; secrets: unknown; enabled: unknown };
      }) =>
        Promise.resolve(
          row({
            enabled: args.create.enabled,
            config: args.create.config,
            secrets: args.create.secrets,
          }),
        ),
      );
      const view = await service.update('yandex', {
        enabled: true,
        config: { clientId: 'cid-1' },
        secrets: { clientSecret: 'plain-secret' },
      }, AUDIT);
      expect(secretService.encrypt).toHaveBeenCalledWith('plain-secret');
      const upsertArg = prisma.integration.upsert.mock.calls[0][0];
      expect(upsertArg.create.config).toEqual({ clientId: 'cid-1' });
      expect(upsertArg.create.secrets).toMatchObject({
        clientSecret: expect.stringMatching(/^v1\./),
      });
      expect(JSON.stringify(upsertArg.create)).not.toContain('plain-secret');
      expect(view.secretsConfigured).toEqual({ clientSecret: true });
      expect(JSON.stringify(view)).not.toContain('plain-secret');
    });

    it('an empty-string secret keeps the stored secret untouched', async () => {
      prisma.integration.findUnique.mockResolvedValue(
        row({
          enabled: true,
          config: { clientId: 'cid-1' },
          secrets: { clientSecret: 'v1.old-envelope' },
        }),
      );
      prisma.integration.upsert.mockImplementation((args: {
        update: { secrets: unknown };
      }) =>
        Promise.resolve(
          row({
            enabled: args.update.enabled,
            secrets: args.update.secrets,
          }),
        ),
      );
      await service.update('yandex', {
        enabled: true,
        config: {},
        secrets: { clientSecret: '' },
      }, AUDIT);
      expect(secretService.encrypt).not.toHaveBeenCalled();
      const upsertArg = prisma.integration.upsert.mock.calls[0][0];
      expect(upsertArg.update.secrets).toEqual({ clientSecret: 'v1.old-envelope' });
    });

    it('an absent secret field keeps the stored secret (partial update)', async () => {
      prisma.integration.findUnique.mockResolvedValue(
        row({
          config: { clientId: 'cid-1' },
          secrets: { clientSecret: 'v1.old-envelope' },
        }),
      );
      prisma.integration.upsert.mockImplementation((args: {
        update: { secrets: unknown; config: unknown; enabled: unknown };
      }) =>
        Promise.resolve(
          row({
            enabled: args.update.enabled,
            config: args.update.config,
            secrets: args.update.secrets,
          }),
        ),
      );
      const view = await service.update('yandex', {
        enabled: true,
        config: { clientId: 'cid-2' },
      }, AUDIT);
      expect(secretService.encrypt).not.toHaveBeenCalled();
      const upsertArg = prisma.integration.upsert.mock.calls[0][0];
      expect(upsertArg.update.secrets).toEqual({ clientSecret: 'v1.old-envelope' });
      expect(upsertArg.update.config).toEqual({ clientId: 'cid-2' });
      expect(view.enabled).toBe(true);
    });

    it('a SUPER_ADMIN replace stores the new secret only as an envelope', async () => {
      prisma.integration.upsert.mockImplementation((args: {
        create: { secrets: unknown };
      }) => Promise.resolve(row({ secrets: args.create.secrets })));
      await service.update('vk', { secrets: { clientSecret: 'new-plain' } }, AUDIT);
      const upsertArg = prisma.integration.upsert.mock.calls[0][0];
      expect(upsertArg.create.secrets).toMatchObject({
        clientSecret: expect.stringMatching(/^v1\./),
      });
      expect(JSON.stringify(upsertArg.create)).not.toContain('new-plain');
    });

    it('unknown and secret field names are rejected in config', async () => {
      await expect(
        service.update('yandex', { config: { nope: 'https://evil.example' } }, AUDIT),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('yandex', { config: { clientSecret: 'nope' } }, AUDIT),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.integration.upsert).not.toHaveBeenCalled();
    });

    it('the redirect URI is writable but only inside the backend allowlist (M-INTEGRATIONS-2)', async () => {
      prisma.integration.findUnique.mockResolvedValue(null);
      prisma.integration.upsert.mockImplementation((args: {
        create: { config: unknown };
      }) => Promise.resolve(row({ config: args.create.config })));

      // The ENV-registered callback is accepted and stored…
      await service.update('yandex', {
        config: {
          clientId: 'cid-1',
          redirectUri: 'https://api.test/api/auth/oauth/yandex/callback',
        },
      }, AUDIT);
      expect(prisma.integration.upsert).toHaveBeenCalled();

      // …an arbitrary URL never is.
      prisma.integration.upsert.mockClear();
      await expect(
        service.update('yandex', {
          config: { redirectUri: 'https://attacker.example/api/auth/oauth/yandex/callback' },
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.integration.upsert).not.toHaveBeenCalled();
    });

    it('unknown secret field names are rejected', async () => {
      await expect(
        service.update('vk', { secrets: { apiKey: 'nope' } }, AUDIT),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.integration.upsert).not.toHaveBeenCalled();
    });
  });

  describe('secret removal and reset', () => {
    it('removes exactly the named secret', async () => {
      prisma.integration.findUnique.mockResolvedValue(
        row({
          provider: 'VK',
          secrets: { clientSecret: 'v1.old' },
        }),
      );
      prisma.integration.update.mockResolvedValue(row({ provider: 'VK' }));
      await service.removeSecret('vk', 'clientSecret', AUDIT);
      const updateArg = prisma.integration.update.mock.calls[0][0];
      expect(updateArg.data.secrets).toEqual({});
    });

    it('removing an unset secret is a 404', async () => {
      await expect(service.removeSecret('vk', 'clientSecret', AUDIT)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('reset deletes the stored row', async () => {
      await service.remove('vk', AUDIT);
      expect(prisma.integration.deleteMany).toHaveBeenCalledWith({
        where: { provider: 'VK' },
      });
    });
  });

  describe('audit events (M-AUDIT-1)', () => {
    const auditEntries = () =>
      auditService.logInTransaction.mock.calls.map((call) => call[1]);

    it('a fresh PUT emits integration.created with allowlisted metadata only', async () => {
      prisma.integration.upsert.mockImplementation((args: {
        create: { config: unknown; secrets: unknown; enabled: unknown };
      }) =>
        Promise.resolve(
          row({
            enabled: args.create.enabled,
            config: args.create.config,
            secrets: args.create.secrets,
          }),
        ),
      );
      await service.update(
        'yandex',
        {
          enabled: true,
          config: {
            clientId: 'cid-1',
            redirectUri: 'https://api.test/api/auth/oauth/yandex/callback',
          },
          secrets: { clientSecret: 'plain-secret-XYZ' },
        },
        AUDIT,
      );
      const created = auditEntries().find(
        (entry) => entry.action === 'integration.created',
      );
      expect(created).toMatchObject({
        entityType: 'integration',
        entityId: 'YANDEX',
        actor: { id: '00000000-0000-0000-0000-0000000000aa', role: 'SUPER_ADMIN' },
      });
      expect(created.metadata).toEqual({
        changedFields: ['clientId', 'redirectUri'],
        secretFields: ['clientSecret'],
        enabled: true,
      });
      // No values, no secrets — only field names.
      expect(JSON.stringify(auditEntries())).not.toContain('plain-secret');
      expect(JSON.stringify(auditEntries())).not.toContain('cid-1');
    });

    it('enable, config change and secret set produce their own events', async () => {
      prisma.integration.findUnique.mockResolvedValue(
        row({ enabled: false, config: { clientId: 'old', redirectUri: '' } }),
      );
      prisma.integration.upsert.mockImplementation((args: {
        update: { enabled: unknown; config: unknown };
      }) =>
        Promise.resolve(
          row({ enabled: args.update.enabled, config: args.update.config }),
        ),
      );
      await service.update(
        'yandex',
        {
          enabled: true,
          config: { clientId: 'cid-2' },
          secrets: { clientSecret: 'replacement' },
        },
        AUDIT,
      );
      const actions = auditEntries().map((entry) => entry.action);
      expect(actions).toContain('integration.updated');
      expect(actions).toContain('integration.enabled');
      expect(actions).toContain('integration.secret_set');
      const updated = auditEntries().find(
        (entry) => entry.action === 'integration.updated',
      );
      expect(updated.metadata).toEqual({ changedFields: ['clientId'] });
    });

    it('disabling emits integration.disabled', async () => {
      prisma.integration.findUnique.mockResolvedValue(row({ enabled: true }));
      prisma.integration.upsert.mockImplementation((args: {
        update: { enabled: unknown };
      }) => Promise.resolve(row({ enabled: args.update.enabled })));
      await service.update('yandex', { enabled: false }, AUDIT);
      expect(auditEntries().map((entry) => entry.action)).toContain(
        'integration.disabled',
      );
    });

    it('the secret value is never written into audit metadata', async () => {
      prisma.integration.findUnique.mockResolvedValue(row({ enabled: true }));
      prisma.integration.upsert.mockResolvedValue(row({}));
      await service.update(
        'yandex',
        { enabled: true, config: {}, secrets: { clientSecret: 'TEST_SECRET_SHOULD_NEVER_APPEAR' } },
        AUDIT,
      );
      expect(JSON.stringify(auditEntries())).not.toContain(
        'TEST_SECRET_SHOULD_NEVER_APPEAR',
      );
    });

    it('secret delete and reset emit their events; the mutation+audit pair runs in one $transaction', async () => {
      prisma.integration.findUnique.mockResolvedValue(
        row({ secrets: { clientSecret: 'v1.old' } }),
      );
      prisma.integration.update.mockResolvedValue(row({}));
      await service.removeSecret('vk', 'clientSecret', AUDIT);
      expect(auditEntries()).toContainEqual(
        expect.objectContaining({
          action: 'integration.secret_deleted',
          metadata: { secretField: 'clientSecret', operation: 'delete' },
        }),
      );
      expect(prisma.$transaction).toHaveBeenCalled();
      await service.remove('vk', AUDIT);
      expect(auditEntries().map((entry) => entry.action)).toContain(
        'integration.deleted',
      );
      // Values of removed secrets never appear in the audit trail.
      expect(JSON.stringify(auditEntries())).not.toContain('v1.old');
    });
  });
});
