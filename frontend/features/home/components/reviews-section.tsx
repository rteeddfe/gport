"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, MessageSquarePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "cn";

import { Container } from "@/components/layout/container";
import { Stars } from "@/features/reviews/components/stars";
import { ReviewFormDialog } from "@/features/reviews/components/review-form-dialog";
import { riseItem, staggerContainer } from "./motion-presets";
import { SectionHeading } from "./section-heading";

/** Server-formatted review row for the carousel (dates are formatted on
 * the server to keep SSR/client markup identical). */
export interface HomepageReviewItem {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  dateLabel: string;
}

const CARD_GAP_PX = 16;

function arrowButtonClass(): string {
  return cn(
    "border-border bg-raised/40 hover:border-brand/50 grid size-10 shrink-0 place-items-center rounded-full border transition-colors",
  );
}

/** Up to 10 latest published reviews (fetched server-side on the homepage):
 * three cards per view — an infinite native scroll-snap carousel with
 * arrow buttons, no carousel dependency. The card list is rendered three
 * times; after any scroll settles the track silently jumps into the middle
 * copy, so it never hits an end. The separate 4th block is the "Оставить
 * отзыв" CTA opening the review form dialog; «Все отзывы» leads to
 * /reviews. */
export function ReviewsSection({ reviews }: { reviews: HomepageReviewItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [formOpen, setFormOpen] = useState(false);
  const settleTimer = useRef<number | undefined>(undefined);

  // Start on the middle copy; content is identical everywhere, so there is
  // no visible jump even before this runs.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: el.scrollWidth / 3 });
    return () => window.clearTimeout(settleTimer.current);
  }, []);

  const handleScroll = useCallback(() => {
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      const el = trackRef.current;
      if (!el) return;
      const copyWidth = el.scrollWidth / 3;
      if (el.scrollLeft < copyWidth - 4) {
        el.scrollTo({ left: el.scrollLeft + copyWidth });
      } else if (el.scrollLeft > copyWidth * 2 + 4) {
        el.scrollTo({ left: el.scrollLeft - copyWidth });
      }
    }, 120);
  }, []);

  const scrollByCard = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const delta = (card ? card.offsetWidth + CARD_GAP_PX : el.clientWidth / 3) * direction;
    const start = el.scrollLeft;
    const target = start + delta;
    el.scrollBy({ left: delta, behavior: "smooth" });
    // Embedded browsers (the in-app preview) can skip programmatic smooth
    // scrolling entirely — fall back to an instant snap to the target.
    window.setTimeout(() => {
      if (Math.abs(el.scrollLeft - start) < 1) el.scrollTo({ left: target });
    }, 120);
  };

  const hasReviews = reviews.length > 0;
  const loopedReviews = hasReviews ? [...reviews, ...reviews, ...reviews] : [];

  return (
    <section id="reviews" className="scroll-mt-24 pb-16">
      <Container>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.div variants={riseItem} className="flex items-end justify-between gap-4">
            <SectionHeading
              kicker="Отзывы"
              title={
                <>
                  Что говорят <span className="text-gradient">покупатели</span>
                </>
              }
            />
            <div className="flex gap-2 pb-1">
              <button
                type="button"
                aria-label="Предыдущие отзывы"
                onClick={() => scrollByCard(-1)}
                className={arrowButtonClass()}
              >
                <ChevronLeft className="text-muted-foreground size-4.5" />
              </button>
              <button
                type="button"
                aria-label="Следующие отзывы"
                onClick={() => scrollByCard(1)}
                className={arrowButtonClass()}
              >
                <ChevronRight className="text-muted-foreground size-4.5" />
              </button>
            </div>
          </motion.div>

          {/* 4-column row: the infinite carousel container spans 3 columns
              (three review cards per view — the list renders three times and
              wraps), the 4th column is the static "Оставить отзыв" CTA. */}
          <div className="mt-10 grid gap-4 xl:grid-cols-4">
            <motion.div
              variants={riseItem}
              ref={trackRef}
              onScroll={handleScroll}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:col-span-3"
            >
              {hasReviews ? (
                loopedReviews.map((review, index) => (
                  <figure
                    key={`${review.id}-${index}`}
                    data-card
                    aria-hidden={index < reviews.length || index >= reviews.length * 2}
                    className="border-border bg-surface flex w-[85%] shrink-0 snap-start flex-col gap-4 rounded-2xl border p-6 sm:w-[calc((100%-1rem)/2)] xl:w-[calc((100%-2rem)/3)]"
                  >
                    <Stars rating={review.rating} />
                    <blockquote className="text-sm leading-relaxed text-foreground/85">
                      {review.text}
                    </blockquote>
                    <figcaption className="mt-auto flex items-center gap-3">
                      <span
                        aria-hidden
                        className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand/40 to-neon/30 text-sm font-semibold"
                      >
                        {review.authorName.slice(0, 1)}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{review.authorName}</span>
                        <span className="text-muted-foreground block text-xs">
                          {review.dateLabel}
                        </span>
                      </span>
                    </figcaption>
                  </figure>
                ))
              ) : (
                <div className="border-border/70 flex w-[85%] shrink-0 snap-start items-center rounded-2xl border border-dashed p-6 sm:w-[calc((100%-1rem)/2)] xl:w-[calc((100%-2rem)/3)]">
                  <p className="text-muted-foreground text-sm">
                    Отзывов пока нет — станьте первым, рассказав о своём опыте.
                  </p>
                </div>
              )}
            </motion.div>

            <motion.div
              variants={riseItem}
              className="border-border/70 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed p-6 text-center"
            >
              <span className="bg-brand/15 text-brand-bright grid size-12 place-items-center rounded-full">
                <MessageSquarePlus className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">Играли у нас?</p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  Расскажите о своём опыте — отзыв появится в этой карусели
                  после проверки.
                </p>
              </div>
              <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
                Оставить отзыв
              </Button>
            </motion.div>
          </div>

          <motion.div variants={riseItem} className="mt-8 flex justify-center">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/reviews">
                Все отзывы
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </Container>

      <ReviewFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </section>
  );
}
