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
 * (settings service); the store ships blank — empty favicon/og simply
 * omit the metadata (an empty href renders a <link href=""> and warns
 * in the console). */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings().catch(() => null);
  const seoTitle = settings?.seoTitle ?? "";
  const seoDescription = settings?.seoDescription ?? "";
  const faviconUrl = settings?.faviconUrl ?? "";
  const yandexVerification = yandexVerificationCode(
    settings?.yandexVerification,
  );

  return {
    title: {
      default: seoTitle,
      template: seoTitle ? `%s — ${seoTitle}` : "%s",
    },
    description: seoDescription,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
    },
    ...(faviconUrl
      ? { icons: { icon: [{ url: faviconUrl }], apple: [{ url: faviconUrl }] } }
      : {}),
    openGraph: {
      ...(seoTitle ? { title: seoTitle } : {}),
      ...(seoDescription ? { description: seoDescription } : {}),
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
        {/* React 19 hoists this into <head>: the Metrika script on every
            page dials mc.yandex.ru — warm the connection early. */}
        <link rel="preconnect" href="https://mc.yandex.ru" />
        <Providers>{children}</Providers>
        <YandexMetrika />
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
