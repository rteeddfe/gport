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
});
