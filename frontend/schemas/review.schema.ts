import { z } from "zod";

/** Mirrors the backend CreateReviewDto (public «Оставить отзыв» form). The
 * backend re-validates everything and rate-limits submissions on top. */
export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  name: z.string().trim().max(40, "Не длиннее 40 символов").optional(),
  text: z
    .string()
    .trim()
    .min(10, "Минимум 10 символов")
    .max(500, "Не длиннее 500 символов"),
});

export type ReviewValues = z.infer<typeof reviewSchema>;
