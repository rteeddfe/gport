import { apiFetch } from "@/lib/api/client";
import type { SiteSettings, SocialLink } from "@/types/api";

export interface UpdateSiteSettingsInput {
  siteName: string;
  supportEmail: string;
  logoUrl: string;
  socials: SocialLink[];
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
  return apiFetch<SiteSettings>("/settings");
}

export function updateSettings(
  input: UpdateSiteSettingsInput,
): Promise<SiteSettings> {
  return apiFetch<SiteSettings, UpdateSiteSettingsInput>("/admin/settings", {
    method: "PUT",
    body: input,
  });
}
