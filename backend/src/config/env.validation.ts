import Joi from 'joi';

function rejectWildcardOrigins(value: string): string {
  if (value.includes('*')) {
    throw new Error('"CORS_ORIGIN" must list explicit origins, not "*"');
  }
  return value;
}

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3001),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  CORS_ORIGIN: Joi.string()
    .custom(rejectWildcardOrigins, 'no wildcard origin')
    .default('http://localhost:3000'),
  TRUST_PROXY: Joi.string().optional(),
  COOKIE_SAME_SITE: Joi.string()
    .valid('Lax', 'None', 'Strict')
    .default('Lax'),
  /** Gates order fulfillment: without a strong secret the webhook HMAC is
   * forgeable. A dev fallback exists for local runs; production must set
   * its own value (both apps share it while the test emulator is on). */
  PAYMENTS_WEBHOOK_SECRET: Joi.string()
    .min(32)
    // `then` is a Joi condition option, not a thenable.
    // oxlint-disable-next-line unicorn/no-thenable
    .when('NODE_ENV', { is: 'production', then: Joi.required() }),
  /** Explicit production opt-in for the TEST payment emulator
   * (M-PAYMENTS-1 §8). Without it, production refuses the emulator even
   * if the admin toggle is on. */
  PAYMENTS_ALLOW_TEST_EMULATOR: Joi.string().valid('true', 'false').default('false'),
  /** OAuth providers (M-OAUTH). Empty client id = the provider is
   * disabled: the start endpoint answers 400. Secrets stay backend-only. */
  YANDEX_CLIENT_ID: Joi.string().allow('').default(''),
  YANDEX_CLIENT_SECRET: Joi.string().allow('').default(''),
  YANDEX_REDIRECT_URI: Joi.string().uri().allow('').default(''),
  VK_CLIENT_ID: Joi.string().allow('').default(''),
  VK_CLIENT_SECRET: Joi.string().allow('').default(''),
  VK_REDIRECT_URI: Joi.string().uri().allow('').default(''),
  /** Master key of the integration secrets vault (M-INTEGRATIONS): hex
   * of exactly 32 bytes (AES-256-GCM). Empty = vault locked: secrets
   * cannot be stored; in production the app refuses to start. */
  INTEGRATIONS_ENCRYPTION_KEY: Joi.string()
    .pattern(/^[0-9a-fA-F]{64}$/)
    .allow('')
    .default(''),
});
