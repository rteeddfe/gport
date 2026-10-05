export interface AppConfiguration {
  port: number;
  jwtSecret: string;
  corsOrigins: string[];
  /** Absolute origin of the storefront — the base of payment redirect
   * URLs. STOREFRONT_ORIGIN when set; falls back to the first CORS origin. */
  storefrontOrigin: string;
  trustProxy: boolean | number | string | undefined;
  cookieSameSite: 'Lax' | 'None' | 'Strict';
  /** HMAC secret of the test-acquiring webhook (the emulator and the API
   * must share it). PAYMENTS_WEBHOOK_SECRET in production. */
  paymentsWebhookSecret: string;
}

/**
 * TRUST_PROXY: "true" | "false" | hop count ("1") | Express trust expression
 * ("loopback", "10.0.0.0/8", comma-separated list). Unset/empty -> undefined
 * (Express default: no proxy trust).
 */
function parseTrustProxy(
  value: string | undefined,
): boolean | number | string | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  if (/^\d+$/.test(value)) {
    return parseInt(value, 10);
  }
  return value;
}

/**
 * COOKIE_SAME_SITE: "Lax" (default — site and API share a host) | "None"
 * (cross-site deployment, e.g. vercel.app site -> onrender.com API; forces
 * Secure) | "Strict". Unknown values fall back to "Lax".
 */
function parseCookieSameSite(value: string | undefined): 'Lax' | 'None' | 'Strict' {
  return value === 'None' || value === 'Strict' ? value : 'Lax';
}

export default (): AppConfiguration => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  jwtSecret: process.env.JWT_SECRET ?? '',
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  storefrontOrigin: process.env.STOREFRONT_ORIGIN ?? '',
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  cookieSameSite: parseCookieSameSite(process.env.COOKIE_SAME_SITE),
  paymentsWebhookSecret:
    process.env.PAYMENTS_WEBHOOK_SECRET ?? 'dev-test-acquiring-secret',
});
