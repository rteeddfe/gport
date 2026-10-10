import { apiFetch } from "@/lib/api/client";
import type {
  FooterMenu,
  HeaderMenuItem,
  SiteSettings,
  SocialLink,
} from "@/types/api";

export interface UpdateSiteSettingsInput {
  siteName: string;
  descriptor: string;
  descriptorFooter: string;
  supportEmail: string;
  legalName: string;
  legalInn: string;
  legalOgrn: string;
  legalAddress: string;
  legalPhone: string;
  logoUrl: string;
  socials: SocialLink[];
  headerMenu: HeaderMenuItem[];
  footerMenus: FooterMenu[];
  seoTitle: string;
  seoDescription: string;
  ogImageUrl?: string | null;
  faviconUrl: string;
  robotsTxt: string;
  manifestName: string;
  manifestShortName: string;
  manifestThemeColor: string;
  manifestBackgroundColor: string;
  manifestIcon192Url: string;
  manifestIcon512Url: string;
  metrikaCounterId: string;
  metrikaWebvisor: boolean;
  yandexVerification: string;
}

export function getSettings(): Promise<SiteSettings> {
  return apiFetch<SiteSettings>("/settings", {
    next: { tags: ["settings"], revalidate: 300 },
  });
}

export function updateSettings(
  input: UpdateSiteSettingsInput,
): Promise<SiteSettings> {
  return apiFetch<SiteSettings, UpdateSiteSettingsInput>("/admin/settings", {
    method: "PUT",
    body: input,
  });
}

/** The settings logo for card/gallery fallbacks (empty = gradient-only
 * fallback without a logo). */
export async function getFallbackLogo(): Promise<string> {
  try {
    return (await getSettings()).logoUrl ?? "";
  } catch {
    return "";
  }
}
