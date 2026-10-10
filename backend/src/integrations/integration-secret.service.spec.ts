import { ConfigService } from '@nestjs/config';
import { IntegrationSecretService } from './integration-secret.service.js';

const VALID_KEY = 'a'.repeat(64);

function makeService(key: string | undefined, nodeEnv = 'development') {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;
  try {
    const config = new ConfigService({ integrations: { encryptionKey: key ?? '' } });
    const service = new IntegrationSecretService(config);
    service.onModuleInit();
    return service;
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
}

describe('IntegrationSecretService (M-INTEGRATIONS-1)', () => {
  it('encrypt → decrypt returns the original value', () => {
    const service = makeService(VALID_KEY);
    const envelope = service.encrypt('super-secret-value');
    expect(envelope).not.toContain('super-secret');
    expect(service.decrypt(envelope)).toBe('super-secret-value');
  });

  it('random IV: the same plaintext never produces the same ciphertext', () => {
    const service = makeService(VALID_KEY);
    const first = service.encrypt('same-value');
    const second = service.encrypt('same-value');
    expect(first).not.toBe(second);
    expect(service.decrypt(first)).toBe('same-value');
    expect(service.decrypt(second)).toBe('same-value');
  });

  it('a tampered ciphertext is rejected (GCM auth tag)', () => {
    const service = makeService(VALID_KEY);
    const envelope = service.encrypt('top-secret');
    const parts = envelope.split('.');
    const payload = Buffer.from(parts[3], 'base64url');
    payload[0] = payload[0] ^ 0x01;
    parts[3] = payload.toString('base64url');
    expect(() => service.decrypt(parts.join('.'))).toThrow();
  });

  it('an unknown envelope format is rejected', () => {
    const service = makeService(VALID_KEY);
    expect(() => service.decrypt('plaintext-value')).toThrow();
  });

  it('a key of the wrong size is rejected and the vault stays locked', () => {
    const service = makeService('a'.repeat(63));
    expect(service.isUnlocked()).toBe(false);
    expect(() => service.encrypt('x')).toThrow(/не настроено/);
  });

  it('a missing key in production refuses to start', () => {
    expect(() => makeService('', 'production')).toThrow(
      /INTEGRATIONS_ENCRYPTION_KEY/,
    );
  });

  it('a missing key in development locks the vault instead of crashing', () => {
    const service = makeService('');
    expect(service.isUnlocked()).toBe(false);
    expect(() => service.encrypt('x')).toThrow(/не настроено/);
  });
});
