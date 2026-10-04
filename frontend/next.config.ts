import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server runs as "localhost", but the browser reaches it via
  // 127.0.0.1 — without this, Next 16 blocks /_next/* (HMR, chunks) as
  // cross-origin and the page never hydrates.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
