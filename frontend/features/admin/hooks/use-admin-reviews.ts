"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { revalidateStorefrontTags } from "@/lib/revalidate";
import {
  adminDeleteReview,
  adminGetReviews,
  adminUpdateReview,
  type AdminReviewUpdateInput,
  type FindReviewsParams,
} from "@/services/reviews.service";
import type { ReviewStatus } from "@/types/api";

export function useAdminReviews(params: FindReviewsParams = {}) {
  return useQuery({
    queryKey: ["admin-reviews", params],
    queryFn: () => adminGetReviews(params),
  });
}

export function useAdminReviewMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    // The public homepage/reviews lists read the same rows server-side;
    // «admin-pending» keeps the sidebar «новые отзывы» chip in sync.
    void revalidateStorefrontTags(["reviews"]);
    queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    queryClient.invalidateQueries({ queryKey: ["admin-pending"] });
  };

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminReviewUpdateInput }) =>
      adminUpdateReview(id, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteReview(id),
    onSuccess: invalidate,
  });

  return { update, remove };
}
