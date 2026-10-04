import { getSettings } from "@/services/settings.service";

export const dynamic = "force-dynamic";

/** robots.txt served verbatim from the admin site settings (the «SEO» tab). */
export async function GET() {
  const settings = await getSettings().catch(() => null);
  const body =
    settings?.robotsTxt ?? "User-agent: *\nAllow: /\nDisallow: /admin\n";

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
