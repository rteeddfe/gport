"use client";

import { motion } from "framer-motion";
import { Gamepad2, Wallet } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { HERO_DEFAULT_CONTENT, type HeroBannerContent } from "../hero-content";
import { HeroCarouselCylinder } from "./hero-carousel-cylinder";
import { riseItem, staggerContainer } from "./motion-presets";

/**
 * Home hero banner (first block) — evolved from the approved «Терминал»
 * (picked 2026-10-03 from five demos on /design/banners, demo deleted;
 * grid + HUD rings removed same day per user request): `bg-surface`
 * panel with soft violet/cyan radial-gradient washes (the news-card
 * cover language), the kicker over the visible <h1>, a pure-CSS
 * rotating cylinder carousel on the right (hero-carousel-cylinder.tsx,
 * picked 2026-10-05 from five candidates on /design/carousel — demo
 * deleted; placeholder covers and dummy text for now) and
 * ghost-number advantage tiles below. Texts come from the admin
 * «Настройки сайта → Главная страница»; the service wall is the second
 * block. The right-column art centers against the text zone (kicker →
 * CTAs), not the whole panel including the tiles.
 *
 * Mobile (below lg) — the «Неон и веер обложек» variant picked 2026-10-05
 * on /design/hero-mobile (preview deleted), since 2026-10-05 evening with
 * the same cylinder carousel as desktop instead of the cover fan (user:
 * same HTML elements, CSS-only adaptation, lighter on load): one set of
 * nodes — full-bleed glow background, full-width stacked CTAs, thesis
 * tiles as a 2-column chip grid and the cylinder ring (smaller, mirror
 * layer hidden) under them. No duplicated texts: both looks render the
 * same nodes.
 */
export function HeroBanner({
  content = HERO_DEFAULT_CONTENT,
}: {
  content?: HeroBannerContent;
}) {
  return (
    <section className="relative pb-16 pt-4">
      <Container>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="relative min-h-[calc(100svh-10rem)] overflow-visible rounded-none border border-transparent bg-transparent lg:grid lg:min-h-0 lg:grid-cols-[58%_42%] lg:grid-rows-[1fr_auto] lg:overflow-hidden lg:rounded-3xl lg:border-border lg:bg-surface"
        >
          {/* Mobile: the variant-2 glows, bleeding past the container
              padding to the screen edges; desktop: the panel washes, same
              language as the news-card covers. */}
          <div
            aria-hidden
            className="absolute inset-y-0 -inset-x-4 bg-[radial-gradient(24rem_18rem_at_85%_10%,rgb(139_92_246/0.26),transparent_65%),radial-gradient(20rem_14rem_at_5%_28%,rgb(85_221_229/0.14),transparent_65%),radial-gradient(28rem_20rem_at_50%_108%,rgb(139_92_246/0.24),transparent_70%)] lg:inset-x-0 lg:bg-[radial-gradient(50rem_28rem_at_75%_35%,rgb(139_92_246/0.16),transparent_70%),radial-gradient(34rem_20rem_at_92%_100%,rgb(85_221_229/0.1),transparent_70%)]"
          />
          {/* Desktop grid: col 1 = text zone, col 2 = carousel, row 2 =
              the tile strip. The carousel node lives before the tiles in
              DOM (mobile reads it in flow, right after the CTAs) and is
              placed into the text-zone row purely with grid classes.
              Stacking: the carousel sits below the tiles and below the
              text content. */}
          <div className="relative z-20 flex flex-col justify-center p-5 sm:p-12 lg:col-start-1 lg:row-start-1 lg:p-16">
            <motion.p
              variants={riseItem}
              className="text-xs font-semibold uppercase tracking-[0.3em] text-neon"
            >
              {content.kicker}
            </motion.p>
            <motion.h1
              variants={riseItem}
              className="mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl"
            >
              {content.title}{" "}
              <span className="text-gradient">{content.titleAccent}</span>
            </motion.h1>
            {content.subtitle ? (
              <motion.p
                variants={riseItem}
                className="text-muted-foreground mt-4 max-w-xl text-sm leading-relaxed"
              >
                {content.subtitle}
              </motion.p>
            ) : null}
            <motion.div variants={riseItem} className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {/* Two admin-managed CTAs: the flagship service link (filled)
                  and the catalog (outline). Empty label/href — no button. */}
              {content.ctaPrimaryHref && content.ctaPrimaryLabel ? (
                <Button asChild size="lg" className="h-12 w-full justify-between rounded-xl px-7 text-base sm:w-fit sm:justify-center">
                  <Link href={content.ctaPrimaryHref}>
                    {content.ctaPrimaryLabel}
                    <span className="grid size-7 place-items-center rounded-full bg-white/15">
                      <Wallet className="size-3.5" aria-hidden />
                    </span>
                  </Link>
                </Button>
              ) : null}
              {content.ctaHref && content.ctaLabel ? (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 w-full justify-between rounded-xl px-7 text-base sm:w-fit sm:justify-center"
                >
                  <Link href={content.ctaHref}>
                    {content.ctaLabel}
                    <span className="bg-brand/15 grid size-7 place-items-center rounded-full">
                      <Gamepad2 className="text-brand-bright size-3.5" aria-hidden />
                    </span>
                  </Link>
                </Button>
              ) : null}
            </motion.div>
          </div>

          {/* Same cylinder as desktop — one set of HTML elements. On
              mobile it reads in flow right after the CTAs (user: tiles
              01–04 go after the carousel) and CSS alone makes it
              lighter: smaller ring, mirror layer display:none (its
              quality-5 images are tiny but skipped from rendering), so
              the phone only renders the 8 cover faces at ~112px.
              Desktop places this node into the text-zone row via grid
              classes, so the DOM order is mobile-first. z-0: the ring
              stays under the tiles and the text content. */}
          <motion.div
            aria-hidden
            variants={riseItem}
            className="relative z-0 mt-2 flex justify-center px-5 lg:col-start-2 lg:row-start-1 lg:mt-0 lg:items-center lg:px-0"
          >
            <HeroCarouselCylinder cards={content.carouselCards} />
          </motion.div>

          <motion.ul
            variants={riseItem}
            className="relative z-10 grid grid-cols-2 gap-2.5 p-5 lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:grid-cols-4 lg:gap-3"
          >
            {/* «Призраки» — picked 2026-10-04 from five demos on
                /design/tiles, demo deleted. */}
            {content.tiles.map((text, i) => (
              <li
                key={text}
                className="border-border/60 bg-canvas/70 relative overflow-hidden rounded-2xl border p-3 pt-3.5 lg:p-4 lg:pt-5"
              >
                <span
                  aria-hidden
                  className="from-brand/70 to-neon/40 absolute top-0 left-4 h-0.5 w-8 rounded-full bg-gradient-to-r lg:left-5 lg:w-10"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-1 -bottom-4 font-mono text-5xl font-bold text-foreground/[0.06] select-none lg:-bottom-5 lg:text-7xl"
                >
                  0{i + 1}
                </span>
                <p className="relative text-xs leading-snug text-foreground/85 lg:text-sm">{text}</p>
              </li>
            ))}
          </motion.ul>
        </motion.div>
      </Container>
    </section>
  );
}
