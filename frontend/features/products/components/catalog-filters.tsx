"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "cn";
import type { Category } from "@/types/api";

const SORTS = [
  { value: "new", label: "Сначала новые" },
  { value: "price_asc", label: "Сначала дешевле" },
  { value: "price_desc", label: "Сначала дороже" },
];

/**
 * Catalog filter bar: category chips, search and sorting — all encoded
 * in the URL query (?category=&search=&sort=), so every state is
 * shareable and the Server Component page refetches on navigation.
 */
export function CatalogFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const category = params.get("category") ?? "";
  const sort = params.get("sort") ?? "new";
  const [search, setSearch] = useState(params.get("search") ?? "");

  const push = (updates: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    next.delete("page");
    const query = next.toString();
    router.push(`/products${query ? `?${query}` : ""}`);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    push({ search: search.trim() });
  };

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-200",
      active
        ? "border-brand bg-brand text-white"
        : "border-border bg-canvas/50 text-muted-foreground hover:border-brand/50 hover:text-foreground",
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => push({ category: "" })} className={chip(!category)}>
          Все
        </button>
        {categories.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => push({ category: item.slug })}
            className={chip(category === item.slug)}
          >
            {item.name}
            <span className="ml-1.5 text-xs opacity-60">{item.productsCount}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={submitSearch} className="relative flex-1" noValidate>
          <Search
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по каталогу…"
            className="bg-canvas/50 pl-10"
            aria-label="Поиск по каталогу"
          />
        </form>
        <Select value={sort} onValueChange={(value) => push({ sort: value === "new" ? "" : value })}>
          <SelectTrigger className="w-full bg-canvas/50 sm:w-52" aria-label="Сортировка">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
