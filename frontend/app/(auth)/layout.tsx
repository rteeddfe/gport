import { Footer } from "@/components/layout/footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CookieBanner } from "@/features/consent/components/cookie-banner";
import { SupportBubble } from "@/features/support/components/support-bubble";

/** Auth screens keep the storefront chrome around the centered card. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="relative flex flex-1 items-center justify-center px-4 pb-12 pt-32">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="bg-brand/25 absolute -top-16 left-[12%] h-72 w-96 rounded-full blur-3xl" />
          <div className="bg-neon/15 absolute -bottom-20 right-[10%] h-72 w-96 rounded-full blur-3xl" />
        </div>
        <div className="relative w-full max-w-md">{children}</div>
      </main>
      <Footer />
      <SupportBubble />
      <CookieBanner />
    </>
  );
}
