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
  /** Explicit production opt-in for the TEST payment emulator. In
   * production the emulator stays disabled unless this is true. */
  paymentsAllowTestEmulator: boolean;
  /** Per-provider OAuth configuration (M-OAUTH); clientId '' = disabled. */
  oauth: Record<'yandex' | 'vk', OAuthProviderConfiguration>;
  /** Integration secrets master key (M-INTEGRATIONS): hex of a 32-byte
   * AES-256-GCM key. '' = secrets vault locked (encryption refused; in
   * production the app refuses to start). */
  integrations: { encryptionKey: string };
}

export interface OAuthProviderConfiguration {
  clientId: string;
  clientSecret: string;
  /** Full callback URL registered with the provider — NEVER taken from
   * a request. Exact-match allowlist entry. */
  redirectUri: string;
  /** Provider authorize endpoint (fixed, official). */
  authorizeEndpoint: string;
  /** Space-separated scope list requested at authorize time. */
  scope: string;
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
  paymentsAllowTestEmulator: process.env.PAYMENTS_ALLOW_TEST_EMULATOR === 'true',
  oauth: {
    // Endpoints per the official docs (Yandex: code-url.md; VK:
    // auth-without-sdk-web). Scopes: Yandex — permission groups
    // (id/login always returned, email needs login:email); VK — the
    // default vkid.personal_info rides along, email must be asked.
    yandex: {
      clientId: process.env.YANDEX_CLIENT_ID ?? '',
      clientSecret: process.env.YANDEX_CLIENT_SECRET ?? '',
      redirectUri: process.env.YANDEX_REDIRECT_URI ?? '',
      authorizeEndpoint: 'https://oauth.yandex.ru/authorize',
      scope: 'login:info login:email',
    },
    vk: {
      clientId: process.env.VK_CLIENT_ID ?? '',
      clientSecret: process.env.VK_CLIENT_SECRET ?? '',
      redirectUri: process.env.VK_REDIRECT_URI ?? '',
      authorizeEndpoint: 'https://id.vk.ru/authorize',
      scope: 'email',
    },
  },
  integrations: {
    encryptionKey: process.env.INTEGRATIONS_ENCRYPTION_KEY ?? '',
  },
});
