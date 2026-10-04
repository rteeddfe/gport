import { apiFetch } from "@/lib/api/client";
import type { SearchSuggestion } from "@/types/api";

export function suggest(q: string, signal?: AbortSignal): Promise<SearchSuggestion> {
  return apiFetch<SearchSuggestion>(`/search/suggest?q=${encodeURIComponent(q)}`, { signal });
}
