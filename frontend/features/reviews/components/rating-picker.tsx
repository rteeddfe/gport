"use client";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/** Five-star radio group used by the public «Оставить отзыв» form and the
 * admin review edit dialog. */
export function RatingPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Оценка">
      {Array.from({ length: 5 }, (_, i) => {
        const star = i + 1;
        const active = star <= value;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} из 5`}
            onClick={() => onChange(star)}
            className="rounded-xs p-0.5 transition-transform hover:scale-110"
          >
            <Star
              aria-hidden
              className={cn(
                "size-6 transition-colors",
                active ? "fill-neon text-neon" : "text-border",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
