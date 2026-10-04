import type { MetadataRoute } from "next";

import { getSettings } from "@/services/settings.service";

/** The PWA manifest, generated from the admin site settings («SEO» tab). */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings().catch(() => null);

  return {
    name: settings?.manifestName ?? "GPort — магазин цифровых товаров",
    short_name: settings?.manifestShortName ?? "GPort",
    description:
      settings?.seoDescription ??
      "Интернет-магазин цифровых игровых товаров и пополнений",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color:
      settings?.manifestBackgroundColor ?? "#0B0D12",
    theme_color: settings?.manifestThemeColor ?? "#0B0D12",
    lang: "ru",
    icons: [
      {
        src: settings?.faviconUrl ?? "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: settings?.manifestIcon192Url ?? "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: settings?.manifestIcon512Url ?? "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
