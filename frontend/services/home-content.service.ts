import { apiFetch } from "@/lib/api/client";
import type {
  HomeCommunityCard,
  HomeContent,
  HomeStatCard,
  HomeWallCard,
} from "@/types/api";

export interface UpdateHomeContentInput {
  kicker: string;
  title: string;
  titleAccent: string;
  subtitle?: string;
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  ctaLabel: string;
  ctaHref: string;
  tiles: string[];
  wallCards: HomeWallCard[];
  carouselCards: HomeWallCard[];
  /** Home-block service refs: picked top-up products (+ optional logo). */
  topupServices: { productId: string; iconUrl?: string | null }[];
  serviceCards: { productId: string; iconUrl?: string | null }[];
  /** Trust block before the news. */
  statCards: HomeStatCard[];
  communityLabel: string;
  communityCards: HomeCommunityCard[];
}

export function getHomeContent(): Promise<HomeContent> {
  return apiFetch<HomeContent>("/home-content", {
    next: { tags: ["home-content"], revalidate: 300 },
  });
}

export function updateHomeContent(
  input: UpdateHomeContentInput,
): Promise<HomeContent> {
  return apiFetch<HomeContent, UpdateHomeContentInput>("/admin/home-content", {
    method: "PUT",
    body: input,
  });
}
