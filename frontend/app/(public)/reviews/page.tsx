import Link from "next/link";

import { Container } from "@/components/layout/container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ReviewCard } from "@/features/reviews/components/review-card";
import { ReviewFormTrigger } from "@/features/reviews/components/review-form-trigger";
import { getErrorMessage } from "@/lib/api/errors";
import { getReviews } from "@/services/reviews.service";
import type { Review } from "@/types/api";

export const metadata = { title: "Отзывы" };

const PAGE_SIZE = 12;

type SearchParams = Promise<{ page?: string }>;

/** Public reviews page: every PUBLISHED review (enforced by the API),
 * newest first, plus the submission form. */
export default async function ReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  let items: Review[] = [];
  let pages = 1;
  let total = 0;
  let errorMessage: string | null = null;

  try {
    const result = await getReviews({ page, limit: PAGE_SIZE });
    items = result.items;
    pages = result.pages;
    total = result.total;
  } catch (error) {
    errorMessage = getErrorMessage(error);
  }

  return (
    <Container className="py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon">Отзывы</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Что говорят <span className="text-gradient">игроки</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
            Опубликованные отзывы покупателей — каждый проходит проверку
            модератором.
          </p>
        </div>
        <ReviewFormTrigger />
      </header>

      <div className="mt-8">
        {errorMessage ? (
          <ErrorState title="Не удалось загрузить отзывы" message={errorMessage} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Отзывов пока нет"
            description="Станьте первым — расскажите о своём опыте покупок."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>

      {!errorMessage && pages > 1 ? (
        <nav
          aria-label="Постраничная навигация"
          className="mt-10 flex items-center justify-center gap-4"
        >
          {page > 1 ? (
            <Link
              href={`/reviews${page > 2 ? `?page=${page - 1}` : ""}`}
              className="border-border bg-surface hover:border-brand/50 hover:glow-brand rounded-lg border px-4 py-2 text-sm transition-colors"
            >
              ← Новее
            </Link>
          ) : null}
          <span className="text-muted-foreground text-sm tabular-nums">
            Страница {page} из {pages} · {total}{" "}
            {total === 1 ? "отзыв" : total < 5 ? "отзыва" : "отзывов"}
          </span>
          {page < pages ? (
            <Link
              href={`/reviews?page=${page + 1}`}
              className="border-border bg-surface hover:border-brand/50 hover:glow-brand rounded-lg border px-4 py-2 text-sm transition-colors"
            >
              Старее →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </Container>
  );
}
