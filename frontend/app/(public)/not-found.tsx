import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { NotFoundCard } from "@/components/layout/not-found-card";

export const metadata: Metadata = {
  title: "Страница не найдена",
};

/** 404 boundary for notFound() thrown inside the (public) group (an
 * unknown policy slug is the only caller today). The group layout already
 * renders Header/Footer/SupportBubble/CookieBanner, so this boundary
 * contributes only the centered card — falling through to the root
 * not-found would render the chrome twice. */
export default function PublicNotFound() {
  return (
    <div className="flex h-full items-center">
      <Container className="py-16 sm:py-20">
        <NotFoundCard />
      </Container>
    </div>
  );
}
