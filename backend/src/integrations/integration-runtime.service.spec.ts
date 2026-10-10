import { ConfigService } from '@nestjs/config';
import { IntegrationRuntimeService } from './integration-runtime.service.js';
import type { IntegrationSecretService } from './integration-secret.service.js';

const ENV_YANDEX = {
  clientId: 'env-yandex-client',
  clientSecret: 'env-yandex-secret',
  redirectUri: 'http://localhost:3001/api/auth/oauth/yandex/callback',
  authorizeEndpoint: 'https://oauth.yandex.ru/authorize',
  scope: 'login:info login:email',
};

const ENV_VK = {
  clientId: 'env-vk-client',
  clientSecret: 'env-vk-secret',
  redirectUri: 'http://localhost/api/auth/oauth/vk/callback',
  authorizeEndpoint: 'https://id.vk.ru/authorize',
  scope: 'email',
};

function makeService(
  rows: Record<string, unknown>,
  envelopes: Record<string, string> = {},
) {
  const prisma = {
    integration: {
      findUnique: vi.fn(async ({ where }: { where: { provider: string } }) =>
        rows[where.provider] ?? null,
      ),
    },
  };
  const secretService = {
    decrypt: vi.fn((envelope: string) => {
      const plain = envelopes[envelope];
      if (plain === undefined) {
        throw new Error('tampered');
      }
      return plain;
    }),
  };
  const config = new ConfigService({ oauth: { yandex: ENV_YANDEX, vk: ENV_VK } });
  return {
    service: new IntegrationRuntimeService(
      prisma as never,
      secretService as unknown as IntegrationSecretService,
      config as never,
    ),
    secretService,
  };
}

const dbRow = (overrides: Record<string, unknown> = {}) => ({
  provider: 'YANDEX',
  enabled: true,
  config: { clientId: 'db-client', redirectUri: ENV_YANDEX.redirectUri },
  secrets: { clientSecret: 'ENVELOPE_OK' },
  ...overrides,
});

describe('IntegrationRuntimeService (M-INTEGRATIONS-2)', () => {
  it('a DB-configured integration wins: DB clientId/redirectUri + decrypted secret', async () => {
    const { service } = makeService({ YANDEX: dbRow() }, { ENVELOPE_OK: 'db-secret-plain' });
    const config = await service.getOAuthConfiguration('yandex');
    expect(config).toMatchObject({
      clientId: 'db-client',
      clientSecret: 'db-secret-plain',
      redirectUri: ENV_YANDEX.redirectUri,
      authorizeEndpoint: 'https://oauth.yandex.ru/authorize',
      scope: 'login:info login:email',
    });
  });

  it('no DB row → ENV fallback (documented backwards compatibility)', async () => {
    const { service, secretService } = makeService({});
    const config = await service.getOAuthConfiguration('yandex');
    expect(config).toBe(ENV_YANDEX);
    expect(secretService.decrypt).not.toHaveBeenCalled();
  });

  it('DB disabled → provider disabled; ENV must NOT be used', async () => {
    const { service } = makeService({ YANDEX: dbRow({ enabled: false }) });
    const config = await service.getOAuthConfiguration('yandex');
    expect(config.clientId).toBe('');
    expect(config.clientSecret).toBe('');
    expect(config.redirectUri).toBe('');
    expect(config.authorizeEndpoint).toBe('https://oauth.yandex.ru/authorize');
  });

  it('DB enabled but incomplete (no redirectUri) → disabled; ENV must NOT be used', async () => {
    const { service } = makeService({
      YANDEX: dbRow({ config: { clientId: 'db-client', redirectUri: '' } }),
    }, { ENVELOPE_OK: 'db-secret-plain' });
    const config = await service.getOAuthConfiguration('yandex');
    expect(config.clientId).toBe('');
    expect(config.clientSecret).toBe('');
    expect(config.redirectUri).toBe('');
  });

  it('DB enabled but incomplete (missing required secret) → disabled', async () => {
    const { service } = makeService({
      YANDEX: dbRow({ secrets: {} }),
    });
    const config = await service.getOAuthConfiguration('yandex');
    expect(config.clientId).toBe('');
    expect(config.clientSecret).toBe('');
  });

  it('an undecryptable secret (rotated key / tamper) → disabled', async () => {
    const { service } = makeService({
      YANDEX: dbRow({ secrets: { clientSecret: 'ENVELOPE_BROKEN' } }),
    }, { ENVELOPE_OK: 'db-secret-plain' });
    const config = await service.getOAuthConfiguration('yandex');
    expect(config.clientSecret).toBe('');
    expect(config.clientId).toBe('');
  });

  it('an admin DB update applies on the very next request (no restart, no cache)', async () => {
    const rows = { YANDEX: dbRow() };
    const envelopes = { ENVELOPE_OK: 'db-secret-plain' };
    const { service } = makeService(rows, envelopes);
    expect((await service.getOAuthConfiguration('yandex')).clientId).toBe('db-client');

    rows.YANDEX = dbRow({
      config: { clientId: 'rotated-client', redirectUri: ENV_YANDEX.redirectUri },
    });
    expect((await service.getOAuthConfiguration('yandex')).clientId).toBe(
      'rotated-client',
    );
  });

  it('VK: the flow uses no client secret — none is decrypted, none is returned', async () => {
    const vkRow = {
      provider: 'VK',
      enabled: true,
      config: { clientId: 'db-vk-client', redirectUri: ENV_VK.redirectUri },
      secrets: { clientSecret: 'ENVELOPE_OK' },
    };
    const { service, secretService } = makeService(
      { VK: vkRow },
      { ENVELOPE_OK: 'vk-plain-secret' },
    );
    const config = await service.getOAuthConfiguration('vk');
    expect(config).toMatchObject({
      clientId: 'db-vk-client',
      clientSecret: '',
      redirectUri: ENV_VK.redirectUri,
    });
    expect(secretService.decrypt).not.toHaveBeenCalled();
  });

  it('VK with a DB row but no clientSecret stored is fully usable', async () => {
    const vkRow = {
      provider: 'VK',
      enabled: true,
      config: { clientId: 'db-vk-client', redirectUri: ENV_VK.redirectUri },
      secrets: {},
    };
    const { service } = makeService({ VK: vkRow });
    const config = await service.getOAuthConfiguration('vk');
    expect(config.clientId).toBe('db-vk-client');
  });
});
