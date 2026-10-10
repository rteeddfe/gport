"use client";

import { useQuery } from "@tanstack/react-query";

import { adminGetTickets } from "@/services/support.service";
import { adminGetReviews } from "@/services/reviews.service";
import type { AuthUser } from "@/types/api";

/** Pending counters for the admin sidebar badges: new support tickets
 * (status NEW) and reviews awaiting moderation (PENDING). The queries
 * run only when the session may see the matching section — an ADMIN
 * without the permission would get a 403 and noise. */
export function useAdminPendingCounts(user: AuthUser | undefined) {
  const mayReviews =
    user?.role === "SUPER_ADMIN" || user?.permissions.includes("reviews");
  const maySupport =
    user?.role === "SUPER_ADMIN" || user?.permissions.includes("support");

  const tickets = useQuery({
    queryKey: ["admin-pending", "support"],
    queryFn: () => adminGetTickets({ status: "NEW", limit: 1 }),
    enabled: maySupport,
    // A handful of minutes is plenty for a sidebar chip.
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
  const reviews = useQuery({
    queryKey: ["admin-pending", "reviews"],
    queryFn: () => adminGetReviews({ status: "PENDING", limit: 1 }),
    enabled: mayReviews,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  return {
    support: maySupport ? tickets.data?.total ?? 0 : 0,
    reviews: mayReviews ? reviews.data?.total ?? 0 : 0,
  };
}
