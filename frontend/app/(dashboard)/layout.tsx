import { Footer } from "@/components/layout/footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CookieBanner } from "@/features/consent/components/cookie-banner";
import { SupportBubble } from "@/features/support/components/support-bubble";

/** Buyer dashboard lives INSIDE the storefront chrome: our header + footer
 * around the account pages (unlike the standalone admin panel). Route
 * access is guarded by proxy.ts (refresh-cookie presence). */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
      <SupportBubble />
      <CookieBanner />
    </>
  );
}
