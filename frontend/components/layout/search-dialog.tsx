"use client";

import { Gamepad2, Folder } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { suggest } from "@/services/search.service";
import type { SearchSuggestion } from "@/types/api";

function formatPrice(priceCents: number): string {
  return `${Math.round(priceCents / 100).toLocaleString("ru-RU")} ₽`;
}

/**
 * Header search: icon opens a command palette that live-queries the public
 * suggest endpoint. Loading is derived from the last loaded query (no
 * setState in the effect body); stale responses are dropped by the
 * AbortController. Product pages are not built yet, so every selection
 * lands on the catalog for now.
 */
export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState<{ q: string; results: SearchSuggestion | null } | null>(
    null,
  );

  const trimmed = query.trim();
  const isActive = trimmed.length >= 2;

  useEffect(() => {
    if (!isActive) {
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      suggest(trimmed, controller.signal)
        .then((results) => {
          if (!controller.signal.aborted) {
            setLoaded({ q: trimmed, results });
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setLoaded({ q: trimmed, results: null });
          }
        });
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [trimmed, isActive]);

  const results = isActive && loaded?.q === trimmed ? loaded.results : null;
  const loading = isActive && loaded?.q !== trimmed;

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const hasResults = results !== null && (results.products.length > 0 || results.categories.length > 0);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Поиск"
      description="Поиск по каталогу товаров и категориям"
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Найти игру или сервис…"
      />
      <CommandList>
        {loading ? (
          <p className="text-muted-foreground py-6 text-center text-sm">Ищем…</p>
        ) : hasResults ? (
          <>
            {results.categories.length > 0 ? (
              <CommandGroup heading="Категории">
                {results.categories.map((category) => (
                  <CommandItem
                    key={category.id}
                    value={`category-${category.name}`}
                    onSelect={() => go("/products")}
                  >
                    <Folder />
                    {category.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {results.products.length > 0 ? (
              <CommandGroup heading="Товары">
                {results.products.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={`product-${product.title}`}
                    onSelect={() => go("/products")}
                  >
                    <Gamepad2 />
                    <span className="flex-1 truncate">{product.title}</span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {formatPrice(product.priceCents)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </>
        ) : (
          <CommandEmpty>
            {isActive ? "Ничего не найдено" : "Введите минимум 2 символа"}
          </CommandEmpty>
        )}
      </CommandList>
    </CommandDialog>
  );
}
