import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { Footer } from "@/components/layout/footer";
import { SiteHeader } from "@/components/layout/site-header";
import { NotFoundCard } from "@/components/layout/not-found-card";
import { CookieBanner } from "@/features/consent/components/cookie-banner";
import { SupportBubble } from "@/features/support/components/support-bubble";

export const metadata: Metadata = {
  title: "Страница не найдена",
};

/** Global 404 for URLs that match NO route group — the root layout owns
 * no chrome, so this page renders Header/main/Footer itself. 404s thrown
 * INSIDE the (public) group render `(public)/not-found.tsx` instead,
 * because the group layout would wrap this page and duplicate the
 * chrome. */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center">
        <Container className="py-16 sm:py-20">
          <NotFoundCard />
        </Container>
      </main>
      <Footer />
      <SupportBubble />
      <CookieBanner />
    </>
  );
}
