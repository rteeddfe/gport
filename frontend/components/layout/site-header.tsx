import { cookies } from "next/headers";

import { REFRESH_TOKEN_COOKIE } from "@/lib/api/auth-cookies";
import { getSettings } from "@/services/settings.service";
import { Header } from "./header";

/** Server wrapper around the client Header: resolves the settings-driven
 * logo/site name once per request (safe fallback if the API is down). */
export async function SiteHeader() {
  const settings = await getSettings().catch(() => null);
  // Same signal the proxy gates on: the long-lived session cookie's
  // PRESENCE is visible to the server before render — the auth widget
  // knows its state without a client round-trip first.
  const hasSession = (await cookies()).has(REFRESH_TOKEN_COOKIE);
  return (
    <Header
      // Everything comes from the settings as-is: no logo configured —
      // no logo rendered (the header handles the empty case safely).
      logoUrl={settings?.logoUrl ?? ""}
      siteName={settings?.siteName ?? ""}
      descriptor={settings?.descriptor ?? ""}
      menu={settings?.headerMenu ?? []}
      hasSession={hasSession}
    />
  );
}
