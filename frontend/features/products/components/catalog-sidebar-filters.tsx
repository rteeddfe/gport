"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Checkbox } from "@/components/ui/checkbox";
import type { ListValue } from "@/types/api";

/**
 * Catalog sidebar facets (games section): genre + platform multi-selects.
 * Every toggle rewrites the URL query (?genre=slug,slug&platform=slug) so
 * the state stays shareable and the Server Component refetches — same
 * contract as the category chips above.
 */
export function CatalogSidebarFilters({
  genres,
  platforms,
  selectedGenre,
  selectedPlatform,
}: {
  genres: ListValue[];
  platforms: ListValue[];
  selectedGenre: string[];
  selectedPlatform: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const push = (key: "genre" | "platform", next: string[]) => {
    const query = new URLSearchParams(params.toString());
    if (next.length > 0) {
      query.set(key, next.join(","));
    } else {
      query.delete(key);
    }
    query.delete("page");
    const qs = query.toString();
    router.push(`/products${qs ? `?${qs}` : ""}`);
  };

  const toggle = (key: "genre" | "platform", current: string[], slug: string) =>
    push(
      key,
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );

  const group = (
    title: string,
    key: "genre" | "platform",
    options: ListValue[],
    selected: string[],
  ) => (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
        {title}
      </p>
      {options.length > 0 ? (
        <div className="space-y-1">
          {options.map((option) => (
            <label
              key={option.slug}
              className="hover:bg-raised/40 flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm"
            >
              <Checkbox
                checked={selected.includes(option.slug)}
                onCheckedChange={() => toggle(key, selected, option.slug)}
                aria-label={`${title}: ${option.name}`}
              />
              {option.name}
            </label>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">Пусто</p>
      )}
    </div>
  );

  return (
    <div className="border-border bg-surface/60 space-y-5 rounded-2xl border p-4">
      {group("Жанр", "genre", genres, selectedGenre)}
      {group("Платформа", "platform", platforms, selectedPlatform)}
      {selectedGenre.length > 0 || selectedPlatform.length > 0 ? (
        <button
          type="button"
          className="text-brand text-xs hover:underline"
          onClick={() => {
            const query = new URLSearchParams(params.toString());
            query.delete("genre");
            query.delete("platform");
            query.delete("page");
            const qs = query.toString();
            router.push(`/products${qs ? `?${qs}` : ""}`);
          }}
        >
          Сбросить фильтры
        </button>
      ) : null}
    </div>
  );
}
