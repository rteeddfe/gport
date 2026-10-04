import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/query-provider";
import { RegisterServiceWorker } from "@/features/pwa/register-sw";
import { YandexMetrika } from "@/components/analytics/yandex-metrika";
import { yandexVerificationCode } from "@/lib/yandex";
import { getSettings } from "@/services/settings.service";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["cyrillic"],
});

/** SEO title/description, favicon and og:image are admin-managed
 * (settings service); the statics below are the API-down fallback. */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings().catch(() => null);
  const seoTitle = settings?.seoTitle ?? "GPort — магазин цифровых товаров";
  const seoDescription =
    settings?.seoDescription ??
    "Интернет-магазин цифровых игровых товаров и услуг";
  const faviconUrl = settings?.faviconUrl ?? "/icons/icon.svg";
  const yandexVerification = yandexVerificationCode(
    settings?.yandexVerification,
  );

  return {
    title: {
      default: seoTitle,
      template: "%s — GPort",
    },
    description: seoDescription,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "GPort",
    },
    icons: {
      icon: [{ url: faviconUrl }],
      apple: [{ url: faviconUrl }],
    },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      ...(settings?.ogImageUrl ? { images: [{ url: settings.ogImageUrl }] } : {}),
    },
    // Yandex Webmaster site verification (admin analytics tab).
    ...(yandexVerification
      ? { verification: { yandex: yandexVerification } }
      : {}),
  };
}

export async function generateViewport(): Promise<Viewport> {
  const settings = await getSettings().catch(() => null);
  return { themeColor: settings?.manifestThemeColor ?? "#0B0D12" };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
        <YandexMetrika />
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
