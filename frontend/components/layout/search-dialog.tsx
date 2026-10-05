"use client";

import { Gamepad2, Folder } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { formatPrice } from "@/lib/format";
import { suggest } from "@/services/search.service";

/**
 * Header search: icon opens a command palette that live-queries the public
 * suggest endpoint. React Query owns the request lifecycle (debounced by
 * the input state; keepPreviousData keeps the last results visible while
 * the next query loads). Product pages are not built yet, so every
 * selection lands on the catalog for now.
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

  const trimmed = query.trim();
  const isActive = trimmed.length >= 2;

  const results = useQuery({
    queryKey: ["suggest", trimmed],
    queryFn: ({ signal }) => suggest(trimmed, signal),
    enabled: open && isActive,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const goProduct = (slug: string) => {
    onOpenChange(false);
    router.push(`/products/${slug}`);
  };

  const goCategory = (slug: string) => {
    onOpenChange(false);
    router.push(`/products?category=${slug}`);
  };

  const data = results.data;
  const hasResults =
    data !== undefined &&
    (data.products.length > 0 || data.categories.length > 0);

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
        {results.isPending && isActive ? (
          <p className="text-muted-foreground py-6 text-center text-sm">Ищем…</p>
        ) : hasResults && data ? (
          <>
            {data.categories.length > 0 ? (
              <CommandGroup heading="Категории">
                {data.categories.map((category) => (
                  <CommandItem
                    key={category.id}
                    value={`category-${category.name}`}
                    onSelect={() => goCategory(category.slug)}
                  >
                    <Folder />
                    {category.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {data.products.length > 0 ? (
              <CommandGroup heading="Товары">
                {data.products.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={`product-${product.title}`}
                    onSelect={() => goProduct(product.slug)}
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
