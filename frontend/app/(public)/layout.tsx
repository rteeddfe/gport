import { Footer } from "@/components/layout/footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CookieBanner } from "@/features/consent/components/cookie-banner";
import { SupportBubble } from "@/features/support/components/support-bubble";

/** Storefront chrome: public header + footer around every storefront page. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <Footer />
      <SupportBubble />
      <CookieBanner />
    </>
  );
}
