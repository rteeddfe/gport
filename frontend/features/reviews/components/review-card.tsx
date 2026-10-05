import { formatDateLong } from "@/lib/format";
import type { Review } from "@/types/api";

import { Stars } from "./stars";

/**
 * Published review card for /reviews: stars, text, author line with a
 * gradient initial and the date the review was written.
 */
export function ReviewCard({ review }: { review: Review }) {
  return (
    <figure className="border-border bg-surface flex h-full flex-col gap-4 rounded-2xl border p-6">
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
            {formatDateLong(review.createdAt)}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
