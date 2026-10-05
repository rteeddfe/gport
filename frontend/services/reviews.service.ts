import { apiFetch } from "@/lib/api/client";
import { buildQuery } from "@/lib/api/query";
import type { Paginated } from "@/lib/api/types";
import type { Review, ReviewStatus } from "@/types/api";

export interface FindReviewsParams {
  page?: number;
  limit?: number;
  status?: ReviewStatus;
}

/** Public list — PUBLISHED reviews only, newest first (the homepage takes
 * the first page; /reviews paginates). */
export function getReviews(params: FindReviewsParams = {}): Promise<Paginated<Review>> {
  return apiFetch<Paginated<Review>>(`/reviews${buildQuery({ ...params })}`, {
    next: { tags: ["reviews"], revalidate: 300 },
  });
}

export interface CreateReviewInput {
  rating: number;
  /** Optional display name; the backend stores «Гость» when empty. */
  authorName?: string;
  text: string;
}

/** Anonymous submission from the storefront — lands in PENDING for
 * moderation. Rate limits: 1/minute per IP, 40/hour globally (429). */
export function createReview(input: CreateReviewInput): Promise<Review> {
  return apiFetch<Review, CreateReviewInput>("/reviews", {
    method: "POST",
    body: input,
  });
}

export interface AdminReviewUpdateInput {
  /** Absent fields stay untouched (backend PATCH is partial). */
  status?: ReviewStatus;
  rating?: number;
  authorName?: string;
  text?: string;
}

export function adminGetReviews(params: FindReviewsParams = {}): Promise<Paginated<Review>> {
  return apiFetch<Paginated<Review>>(`/admin/reviews${buildQuery({ ...params })}`);
}

export function adminUpdateReview(
  id: string,
  input: AdminReviewUpdateInput,
): Promise<Review> {
  return apiFetch<Review, AdminReviewUpdateInput>(`/admin/reviews/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function adminDeleteReview(id: string): Promise<void> {
  return apiFetch<void>(`/admin/reviews/${id}`, { method: "DELETE" });
}
