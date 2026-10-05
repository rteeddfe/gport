import type { NextConfig } from "next";

const apiBase =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
// The browser calls the API through the same-origin /api proxy (see
// lib/api/client.ts) so the session cookies stay first-party on the
// storefront origin; the /api suffix of the public base URL is where the
// Nest global prefix lives.
const backendOrigin = apiBase.replace(/\/api$/, "");

const nextConfig: NextConfig = {
  // The dev server runs as "localhost", but the browser reaches it via
  // 127.0.0.1 — without this, Next 16 blocks /_next/* (HMR, chunks) as
  // cross-origin and the page never hydrates.
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  images: {
    // Next 16 only optimizes qualities listed here. 5 = the deliberately
    // crushed reflection copies in the hero cylinder (heavily blurred
    // by CSS on top); 30 = the decorative blurred product backdrop;
    // 75 = everything else.
    qualities: [5, 30, 75],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86_400,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          // HSTS is a no-op over plain HTTP (dev) and enforced by the
          // browser once the storefront runs behind TLS.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendOrigin}/api/:path*` },
      { source: "/files/:id", destination: `${backendOrigin}/files/:id` },
    ];
  },
};

export default nextConfig;
