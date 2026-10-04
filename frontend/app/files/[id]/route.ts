import { NextRequest, NextResponse } from "next/server";

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api"
).replace(/\/api$/, "");

/** Uploaded files live on the API (StoredFile rows served at /files/:id)
 * and their URLs are stored host-relative — the storefront proxies them so
 * covers resolve on the site origin and stay optimizable by next/image. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const upstream = await fetch(`${API_ORIGIN}/files/${id}`, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return new NextResponse(null, { status: upstream.status });
  }
  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") ?? "application/octet-stream");
  headers.set("Cache-Control", upstream.headers.get("cache-control") ?? "public, max-age=31536000, immutable");
  headers.set("Content-Disposition", upstream.headers.get("content-disposition") ?? "inline");
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
