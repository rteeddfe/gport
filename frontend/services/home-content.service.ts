import { apiFetch } from "@/lib/api/client";
import type { HomeContent } from "@/types/api";

export interface UpdateHomeContentInput {
  kicker: string;
  title: string;
  titleAccent: string;
  subtitle?: string;
  ctaLabel: string;
  ctaHref: string;
  tiles: string[];
}

export function getHomeContent(): Promise<HomeContent> {
  return apiFetch<HomeContent>("/home-content");
}

export function updateHomeContent(
  input: UpdateHomeContentInput,
): Promise<HomeContent> {
  return apiFetch<HomeContent, UpdateHomeContentInput>("/admin/home-content", {
    method: "PUT",
    body: input,
  });
}
