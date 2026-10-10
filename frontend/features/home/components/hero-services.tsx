"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { MotionConfig, motion, useReducedMotion, type Variants } from "framer-motion";

import { Container } from "@/components/layout/container";
import { formatPrice } from "@/lib/format";
import type { HomeServiceCard, HomeWallCard } from "@/types/api";


/** CTA tile sits in the middle of the wall, majestic-style. */
const CTA_GRADIENT =
  "radial-gradient(120% 70% at 50% 0%, rgb(255 255 255 / 0.16), transparent 55%), " +
  "linear-gradient(180deg, #8b5cf6 0%, #7762f2 55%, #55dde5 150%)";

/** Wall entrance: tiles rise in one by one. */
const wallVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
  exit: { transition: { staggerChildren: 0.035 } },
};

const tileVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.97,
    transition: { duration: 0.25, ease: "easeIn" },
  },
};

/** Exit stagger + duration ≈ 0.46s; navigate once the last tile is gone. */
const EXIT_NAVIGATE_MS = 480;

function MosaicCardTile({ card, index }: { card: HomeWallCard; index: number }) {
  return (
    <motion.div variants={tileVariants} className="aspect-[3/4] lg:aspect-auto">
      <Link
        href={card.href}
        style={{ "--tile-glow": "rgb(139 92 246 / 0.45)", "--tile-index": String(index) } as CSSProperties}
        className="service-tile relative block h-full w-full overflow-hidden rounded-2xl"
      >
        <span className="tile-art absolute inset-0">
          {/* Admin uploads may be SVG (/files/:id) — plain img on purpose,
              the same language as the logo and service marks. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        </span>
      </Link>
    </motion.div>
  );
}

/** Admin-picked top-up service tile: the cover art fills the whole tile,
 * the name and the «от N ₽» line sit over the bottom scrim — links to
 * the dedicated top-up page. */
function MosaicServiceTile({
  service,
  index,
}: {
  service: HomeServiceCard;
  index: number;
}) {
  const art = service.iconUrl ?? service.image;
  return (
    <motion.div variants={tileVariants} className="aspect-[3/4] lg:aspect-auto">
      <Link
        href={`/topup/${service.slug}`}
        style={{ "--tile-glow": "rgb(139 92 246 / 0.45)", "--tile-index": String(index) } as CSSProperties}
        className="service-tile relative block h-full w-full overflow-hidden rounded-2xl"
      >
        {art ? (
          // Admin uploads may be SVG (/files/:id) — plain img, same
          // language as the built-in service marks.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={art}
            alt=""
            className="tile-art absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="tile-art absolute inset-0 flex items-center justify-center">
            <span className="tile-logo grid size-14 place-items-center text-2xl font-bold text-white">
              {service.title.slice(0, 1)}
            </span>
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-3 pt-8 pb-2.5">
          <span className="block truncate text-xs font-semibold text-white">
            {service.title}
          </span>
          <span className="mt-0.5 block text-[11px] text-white/65">
            от {formatPrice(service.priceFromCents)}
          </span>
        </span>
      </Link>
    </motion.div>
  );
}

function MosaicCta({ index, onActivate }: { index: number; onActivate: () => void }) {
  // Plain clicks play the wall exit, then navigate; modified clicks
  // (new tab / new window) keep the browser default.
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    onActivate();
  };

  return (
    <motion.div
      variants={tileVariants}
      className="order-first col-span-2 h-32 sm:col-span-3 lg:order-none lg:col-span-1 lg:h-auto"
    >
      <Link
        href="/topup"
        onClick={handleClick}
        style={
          { "--tile-glow": "rgb(139 92 246 / 0.55)", "--tile-index": String(index) } as CSSProperties
        }
        className="service-tile tile-cta relative block h-full w-full overflow-hidden rounded-2xl"
      >
        <span
          className="tile-art absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-white"
          style={{ background: CTA_GRADIENT }}
        >
          <span className="tile-logo grid size-11 shrink-0 place-items-center rounded-full border border-white/40 bg-white/15">
            <LayoutGrid className="size-5" aria-hidden />
          </span>
          <span className="text-sm font-bold">Посмотреть все</span>
        </span>
      </Link>
    </motion.div>
  );
}

/**
 * Home hero — a mosaic wall of top-up service tiles (approved variant 4,
 * «Мозаика»): frameless posters with tight gaps, the caption laid over a
 * bottom scrim. Majestic-style hovers live in the `.service-wall` rules
 * in globals.css; hovering the center «Посмотреть все» tile plays the
 * hover on every tile at once and floods the section backdrop with a
 * bright neon wash (`.hero-glow`).
 *
 * Tiles stagger in on load. Activating the CTA plays the reverse —
 * tiles dissolve and the neon wash fades — and only then navigates to
 * /topup, whose content fades in via the (public) template. Hover
 * transforms stay in CSS on the inner `.service-tile`; the motion
 * wrappers around them own only entrance/exit, so the two never fight
 * over inline transforms.
 *
 * Admin-managed cards (settings → «Главная страница») replace the
 * built-in service tiles when present: each card is a full-bleed image
 * tile linking to its own href.
 */
export function HeroServices({
  cards,
  serviceCards,
}: {
  cards?: HomeWallCard[];
  serviceCards?: HomeServiceCard[];
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const navigateTimer = useRef<number | null>(null);

  // Priority: admin-picked top-up services → legacy image cards. The CTA
  // tile stays in the middle either way; nothing configured → no wall.
  const hasServices = !!serviceCards && serviceCards.length > 0;
  const hasCards = !hasServices && !!cards && cards.length > 0;
  const mid = (count: number) => Math.ceil(count / 2);
  const wallItems: (HomeWallCard | HomeServiceCard | "cta")[] = hasServices
    ? [
        ...serviceCards.slice(0, mid(serviceCards.length)),
        "cta",
        ...serviceCards.slice(mid(serviceCards.length)),
      ]
    : hasCards
      ? [...cards.slice(0, mid(cards.length)), "cta", ...cards.slice(mid(cards.length))]
      : [];

  useEffect(
    () => () => {
      if (navigateTimer.current !== null) window.clearTimeout(navigateTimer.current);
    },
    [],
  );

  const goToTopup = useCallback(() => {
    if (leaving) return;
    if (reduceMotion) {
      router.push("/topup");
      return;
    }
    setLeaving(true);
    navigateTimer.current = window.setTimeout(() => router.push("/topup"), EXIT_NAVIGATE_MS);
  }, [leaving, reduceMotion, router]);

  // Nothing configured by the admin — the wall does not render (the old
  // built-in PS/Battle.net/Nintendo tiles are gone with the hardcoded
  // content).
  if (!hasServices && !hasCards) return null;

  return (
    <MotionConfig reducedMotion="user">
      <section className="hero-wall relative pb-16">
        <motion.div
          className="pointer-events-none absolute inset-0"
          animate={{ opacity: leaving ? 0 : 1 }}
          transition={{ duration: 0.35 }}
        >
          <div
            aria-hidden
            className="hero-glow pointer-events-none absolute inset-0 overflow-hidden"
          >
            {/* Washes + blobs hug the wall's center (the grid sits at
                ~48% of the section height) so the light halos around
                the cards instead of flooding the whole block. */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: [
                  "radial-gradient(36rem 16rem at 50% 46%, rgb(139 92 246 / 0.26), transparent 62%)",
                  "radial-gradient(28rem 14rem at 20% 38%, rgb(139 92 246 / 0.18), transparent 60%)",
                  "radial-gradient(28rem 14rem at 80% 54%, rgb(85 221 229 / 0.18), transparent 60%)",
                ].join(", "),
              }}
            />
            <div className="animate-blob-drift absolute left-[8%] top-[2%] h-[24rem] w-[26rem] rounded-full bg-[radial-gradient(closest-side,rgb(139_92_246/0.5),transparent_72%)] blur-2xl" />
            <div className="animate-blob-drift absolute right-[6%] top-[30%] h-[22rem] w-[24rem] rounded-full bg-[radial-gradient(closest-side,rgb(85_221_229/0.4),transparent_72%)] blur-2xl [animation-delay:-3.5s]" />
            <div className="animate-blob-drift absolute bottom-[4%] left-[36%] h-[22rem] w-[24rem] rounded-full bg-[radial-gradient(closest-side,rgb(167_139_250/0.45),transparent_72%)] blur-2xl [animation-delay:-6s]" />
            <div className="absolute top-[46%] left-1/2 h-[22rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(139_92_246/0.3),transparent)]" />
          </div>
        </motion.div>
      <h2 className="sr-only">Пополнение игровых сервисов</h2>
      <Container>
        <motion.div
          className="service-wall wall-mosaic relative grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:h-[260px] lg:grid-cols-7"
            variants={wallVariants}
            initial="hidden"
            animate={leaving ? "exit" : "show"}
          >
            {wallItems.map((item, index) =>
              item === "cta" ? (
                <MosaicCta key="cta" index={index} onActivate={goToTopup} />
              ) : "imageUrl" in item ? (
                <MosaicCardTile key={`${item.imageUrl}-${index}`} card={item} index={index} />
              ) : (
                <MosaicServiceTile key={item.productId} service={item} index={index} />
              ),
            )}
          </motion.div>
        </Container>
      </section>
    </MotionConfig>
  );
}
