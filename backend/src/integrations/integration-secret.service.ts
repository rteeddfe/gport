import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfiguration } from '../config/configuration.js';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const ENVELOPE_VERSION = 'v1';

/**
 * Secrets vault of the integrations system (M-INTEGRATIONS-1): the only
 * place allowed to encrypt/decrypt integration credentials. Key material
 * comes exclusively from INTEGRATIONS_ENCRYPTION_KEY (hex of 32 bytes —
 * validated by the env schema and again here); values are stored as
 * self-describing envelopes `v1.<iv>.<tag>.<ciphertext>` (base64url).
 * plaintext secrets never reach the DB, the API layer or the logs.
 */
@Injectable()
export class IntegrationSecretService implements OnModuleInit {
  private readonly logger = new Logger(IntegrationSecretService.name);
  private key: Buffer | null = null;

  constructor(private readonly configService: ConfigService) {}

  /** Key validation at startup. Production refuses to boot without a
   * valid key (fail fast — a silently unusable vault is worse); in
   * development the vault locks: writes of secrets are refused with a
   * clear error while the rest of the app keeps working. */
  onModuleInit(): void {
    const hex = this.configService.get<AppConfiguration['integrations']>('integrations')?.encryptionKey ?? '';
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'INTEGRATIONS_ENCRYPTION_KEY must be a 64-char hex string (32 bytes) in production',
        );
      }
      this.logger.warn(
        'INTEGRATIONS_ENCRYPTION_KEY is not set — the integrations secrets vault is LOCKED: saving integration secrets will fail. Generate one with "openssl rand -hex 32".',
      );
      return;
    }
    this.key = Buffer.from(hex, 'hex');
  }

  /** True when the vault can encrypt (key present and valid). */
  isUnlocked(): boolean {
    return this.key !== null;
  }

  encrypt(plaintext: string): string {
    const key = this.requireKey();
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      ENVELOPE_VERSION,
      iv.toString('base64url'),
      tag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join('.');
  }

  /** Throws when the envelope was tampered with (GCM auth tag mismatch)
   * or has an unknown format — callers must treat decrypt failures as
   * "secret unusable", never fall back to raw value exposure. */
  decrypt(envelope: string): string {
    const key = this.requireKey();
    const [version, ivPart, tagPart, dataPart] = envelope.split('.');
    if (version !== ENVELOPE_VERSION || !ivPart || !tagPart || !dataPart) {
      throw new Error('Unknown secret envelope format');
    }
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(ivPart, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  private requireKey(): Buffer {
    if (this.key === null) {
      throw new Error(
        'Интеграции: хранилище секретов не настроено — задайте INTEGRATIONS_ENCRYPTION_KEY',
      );
    }
    return this.key;
  }
}
