import { getSettings } from "@/services/settings.service";
import { Header } from "./header";

export const DEFAULT_LOGO_URL = "/logo2.png";
export const DEFAULT_SITE_NAME = "GPort";

/** Server wrapper around the client Header: resolves the settings-driven
 * logo/site name once per request (safe fallback if the API is down). */
export async function SiteHeader() {
  const settings = await getSettings().catch(() => null);
  return (
    <Header
      logoUrl={settings?.logoUrl ?? DEFAULT_LOGO_URL}
      siteName={settings?.siteName ?? DEFAULT_SITE_NAME}
    />
  );
}
