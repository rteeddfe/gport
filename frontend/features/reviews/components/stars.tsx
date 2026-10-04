import { Star } from "lucide-react";

import { cn } from "cn";

/** Five-star rating display (filled = neon cyan), shared by the storefront
 * review cards and the admin table. */
export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <div className={cn("flex gap-0.5", className)} role="img" aria-label={`Оценка: ${rating} из 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden
          className={cn("size-4", i < rating ? "fill-neon text-neon" : "text-border")}
        />
      ))}
    </div>
  );
}
