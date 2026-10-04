"use client";

import { motion } from "framer-motion";
import { Gamepad2, Wallet } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { HeroCarousel } from "./hero-carousel";
import { riseItem, staggerContainer } from "./motion-presets";

/** Hero content managed from the admin panel (GET /home-content). */
export interface HeroBannerContent {
  kicker: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  tiles: string[];
}

const DEFAULT_CONTENT: HeroBannerContent = {
  kicker: "Пополнение сервисов",
  title: "Пополняй любимые игры",
  titleAccent: "по выгодному курсу",
  subtitle: "",
  ctaLabel: "Каталог игр",
  ctaHref: "/products",
  tiles: [
    "Без ограничений, регистрации и верификации",
    "Без скрытых комиссий и платежей",
    "Моментальная доставка после оплаты",
    "Много способов оплаты",
  ],
};

/**
 * Home hero banner (first block) — evolved from the approved «Терминал»
 * (picked 2026-10-03 from five demos on /design/banners, demo deleted;
 * grid + HUD rings removed same day per user request): `bg-surface`
 * panel with soft violet/cyan radial-gradient washes (the news-card
 * cover language), the kicker over the visible <h1>, a circular 3D card
 * carousel on the right (placeholder covers and dummy text for now — see
 * hero-carousel.tsx) and ghost-number advantage tiles below. Texts come
 * from the admin «Настройки сайта → Главная страница»; the service wall
 * is the second block.
 */
export function HeroBanner({
  content = DEFAULT_CONTENT,
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
          className="relative overflow-hidden rounded-3xl border border-border bg-surface"
        >
          {/* Soft washes, same language as the news-card covers. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(50rem_28rem_at_75%_35%,rgb(139_92_246/0.16),transparent_70%),radial-gradient(34rem_20rem_at_92%_100%,rgb(85_221_229/0.1),transparent_70%)]"
          />
          <motion.div
            aria-hidden
            variants={riseItem}
            className="absolute inset-y-0 right-0 hidden w-[42%] items-center justify-center lg:flex"
          >
            {/* Placeholder art until real content exists: circular 3D
                carousel with fallback covers and dummy text. */}
            <HeroCarousel />
          </motion.div>

          <div className="relative flex flex-col justify-center p-8 sm:p-12 lg:max-w-[58%] lg:p-16">
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
            <motion.div variants={riseItem} className="mt-10 flex flex-wrap gap-3">
              {/* Two entry points: the flagship top-up service and the
                  catalog (label/href stay admin-managed). */}
              <Button asChild size="lg" className="h-12 w-fit rounded-xl px-7 text-base">
                <Link href="/topup">
                  Пополнение
                  <span className="grid size-7 place-items-center rounded-full bg-white/15">
                    <Wallet className="size-3.5" aria-hidden />
                  </span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 w-fit rounded-xl px-7 text-base"
              >
                <Link href={content.ctaHref}>
                  {content.ctaLabel}
                  <span className="bg-brand/15 grid size-7 place-items-center rounded-full">
                    <Gamepad2 className="text-brand-bright size-3.5" aria-hidden />
                  </span>
                </Link>
              </Button>
            </motion.div>
          </div>

          <motion.ul
            variants={riseItem}
            className="relative grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {/* «Призраки» — picked 2026-10-04 from five demos on
                /design/tiles, demo deleted. */}
            {content.tiles.map((text, i) => (
              <li
                key={text}
                className="border-border/60 bg-canvas/70 relative overflow-hidden rounded-2xl border p-4 pt-5"
              >
                <span
                  aria-hidden
                  className="from-brand/70 to-neon/40 absolute top-0 left-5 h-0.5 w-10 rounded-full bg-gradient-to-r"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-1 -bottom-5 font-mono text-7xl font-bold text-foreground/[0.06] select-none"
                >
                  0{i + 1}
                </span>
                <p className="relative text-sm leading-snug text-foreground/85">{text}</p>
              </li>
            ))}
          </motion.ul>
        </motion.div>
      </Container>
    </section>
  );
}
