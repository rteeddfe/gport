import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import type { HomeWallCard } from "@/types/api";

/**
 * Hero banner art: a pure-CSS rotating cylinder of covers — the pick of
 * 2026-10-05 from five candidates on /design/carousel (demo deleted).
 * Ported from «CSS Only 3D Image Carousel» (codepen.io/NiklasKnaack/
 * pen/abrOMLY), softened per review: cards sit under a violet duotone
 * tint (never plain grayscale), a static diagonal sheen adds the
 * highlight, and the reflection renders a quality=5 next/image copy
 * under a heavy blur so the mirror reads as a soft glow rather than a
 * hard mirror. Hover restores full color and pauses the spin; all
 * transforms and filters live in the `.carousel-cylinder-*` block of
 * globals.css.
 *
 * Cards are admin-managed (settings → «Главная страница» → carousel
 * cards: image + link); nothing is configured — the carousel does not
 * render (the old placeholder covers are gone with the hardcoded
 * content).
 */

/** 10×10 violet→cyan JPEG: the blur placeholder for the low-quality
 * reflection copies (path-based images need an explicit blurDataURL). */
const REFLECT_BLUR =
  "/9j/2wBDABsSFBcUERsXFhceHBsgKEIrKCUlKFE6PTBCYFVlZF9VXVtqeJmBanGQc1tdhbWGkJ6jq62rZ4C8ybqmx5moq6T/2wBDARweHigjKE4rK06kbl1upKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKT/wAARCAAKAAoDASIAAhEBAxEB/8QAFwAAAwEAAAAAAAAAAAAAAAAAAAEDBf/EABoQAAICAwAAAAAAAAAAAAAAAAABAgMREjH/xAAUAQEAAAAAAAAAAAAAAAAAAAAC/8QAFhEBAQEAAAAAAAAAAAAAAAAAAAEx/9oADAMBAAIRAxEAPwDEnNt4QtGFfS49C1//2Q==";

/** Responsive intrinsic size for the card images: the mobile ring is
 * narrower, so phones fetch ~112px variants while desktop keeps 144px. */
const CARD_SIZES = "(min-width: 1024px) 144px, 112px";

export function HeroCarouselCylinder({ cards }: { cards?: HomeWallCard[] }) {
  // Nothing configured — nothing rendered (blank store by design).
  if (!cards || cards.length === 0) return null;
  const items = cards.map((card) => ({ src: card.imageUrl, href: card.href }));

  return (
    <div
      role="group"
      aria-label="Популярные товары"
      className="carousel-cylinder"
    >
      <ul
        className="carousel-cylinder-items"
        style={{ "--num": items.length } as CSSProperties}
      >
        {items.map((item, index) => {
          const face = (
            <span className="carousel-cylinder-face">
              {/* The ring sits on the first screen — the front faces are
                  the LCP candidates and load with priority. */}
              <Image
                src={item.src}
                alt=""
                fill
                sizes={CARD_SIZES}
                quality={75}
                priority={index < 4}
                className="object-cover"
              />
            </span>
          );
          const reflection = (
            <span className="carousel-cylinder-reflect">
              <Image
                src={item.src}
                alt=""
                fill
                sizes={CARD_SIZES}
                quality={5}
                placeholder="blur"
                blurDataURL={REFLECT_BLUR}
                className="object-cover"
              />
              <span className="carousel-cylinder-reflect-fade" />
            </span>
          );
          return (
            <li
              key={`${item.src}-${index}`}
              className="carousel-cylinder-item"
              style={{ "--i": index + 1 } as CSSProperties}
            >
              {/* Cards with an admin-set destination link out (the whole
                  face is the link); placeholders render as plain art. */}
              {item.href ? (
                <Link href={item.href} aria-label="Открыть товар" className="contents">
                  {face}
                  {reflection}
                </Link>
              ) : (
                <>
                  {face}
                  {reflection}
                </>
              )}
            </li>
          );
        })}
        <li className="carousel-cylinder-ground" />
      </ul>
    </div>
  );
}
