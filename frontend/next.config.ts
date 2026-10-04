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
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendOrigin}/api/:path*` },
      { source: "/files/:id", destination: `${backendOrigin}/files/:id` },
    ];
  },
};

export default nextConfig;
