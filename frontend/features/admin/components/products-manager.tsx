"use client";

import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminProducts, useAdminProductMutations } from "../hooks/use-admin-products";
import { useCategories } from "../hooks/use-admin-categories";
import { PRODUCT_STATUS_LABELS } from "./product-form";
import { formatPrice } from "@/features/products/components/product-card";
import type { Product, ProductStatus } from "@/types/api";

function statusBadgeVariant(status: ProductStatus): "default" | "secondary" | "outline" {
  if (status === "PUBLISHED") return "default";
  if (status === "DRAFT") return "secondary";
  return "outline";
}

function ProductRow({ product }: { product: Product }) {
  const { remove } = useAdminProductMutations();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError(null);
    try {
      await remove.mutateAsync(product.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка");
      setConfirmDelete(false);
    }
  }

  const cover = product.images[0];

  return (
    <TableRow>
      <TableCell>
        <span className="bg-canvas border-border grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-gradient text-sm font-bold">{product.title.slice(0, 1)}</span>
          )}
        </span>
      </TableCell>
      <TableCell>
        <Link
          href={`/admin/products/${product.id}`}
          className="font-medium hover:text-brand"
        >
          {product.title}
        </Link>
        <p className="text-muted-foreground font-mono text-xs">{product.slug}</p>
      </TableCell>
      <TableCell className="text-sm">{product.category?.name ?? "—"}</TableCell>
      <TableCell className="text-sm font-semibold tabular-nums">
        {formatPrice(product.priceCents)}
        {product.oldPriceCents ? (
          <span className="text-muted-foreground ml-2 text-xs font-medium line-through">
            {formatPrice(product.oldPriceCents)}
          </span>
        ) : null}
      </TableCell>
      <TableCell className="text-sm tabular-nums">{product.stock}</TableCell>
      <TableCell>
        <Badge variant={statusBadgeVariant(product.status)}>
          {PRODUCT_STATUS_LABELS[product.status]}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {new Date(product.updatedAt).toLocaleDateString("ru-RU")}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label={`Изменить ${product.title}`}>
            <Link href={`/admin/products/${product.id}`}>
              <Pencil className="size-4" aria-hidden />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            aria-label={`Удалить ${product.title}`}
            onClick={onDelete}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
        {confirmDelete && !error ? (
          <p className="text-muted-foreground mt-1 max-w-40 text-xs">
            Нажмите удаление ещё раз для подтверждения.
          </p>
        ) : null}
        {error ? <p className="text-destructive mt-1 text-xs">{error}</p> : null}
      </TableCell>
    </TableRow>
  );
}

/** Admin products table: search/status/category filters, pagination,
 * row actions. Create and edit live on their own pages. */
export function ProductsManager() {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | ProductStatus>("ALL");
  const [categoryId, setCategoryId] = useState("ALL");
  const [page, setPage] = useState(1);

  // Debounce the free-text search; the selects reset the page in their
  // own handlers (synchronous setState in an effect trips the lint rule).
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useAdminProducts({
    search: appliedSearch || undefined,
    status: status === "ALL" ? undefined : status,
    categoryId: categoryId === "ALL" ? undefined : categoryId,
    page,
    limit: 10,
  });
  const categories = useCategories();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="filter-search">Поиск</Label>
            <div className="relative">
              <Search
                className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="filter-search"
                placeholder="Название или описание"
                className="w-64 pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Статус</Label>
            <Select value={status} onValueChange={(value) => {
              setStatus(value as "ALL" | ProductStatus);
              setPage(1);
            }}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Все статусы</SelectItem>
                <SelectItem value="PUBLISHED">{PRODUCT_STATUS_LABELS.PUBLISHED}</SelectItem>
                <SelectItem value="DRAFT">{PRODUCT_STATUS_LABELS.DRAFT}</SelectItem>
                <SelectItem value="ARCHIVED">{PRODUCT_STATUS_LABELS.ARCHIVED}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Категория</Label>
            <Select value={categoryId} onValueChange={(value) => {
              setCategoryId(value);
              setPage(1);
            }}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Все категории</SelectItem>
                {(categories.data ?? []).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button asChild className="gap-1.5">
          <Link href="/admin/products/new">
            <Plus className="size-4" aria-hidden />
            Создать товар
          </Link>
        </Button>
      </div>

      {query.isPending ? (
        <p className="text-muted-foreground text-sm">Загружаем товары…</p>
      ) : query.isError ? (
        <p className="text-destructive text-sm">
          Не удалось загрузить товары: {query.error.message}
        </p>
      ) : query.data.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Товары не найдены — измените фильтры или создайте первый товар.
        </p>
      ) : (
        <>
          <div className="border-border overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14" aria-label="Обложка" />
                  <TableHead>Название</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead>Кол-во</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Обновлён</TableHead>
                  <TableHead className="w-24">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((product) => (
                  <ProductRow key={product.id} product={product} />
                ))}
              </TableBody>
            </Table>
          </div>
          {query.data.pages > 1 ? (
            <nav aria-label="Постраничная навигация" className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft aria-hidden />
                Назад
              </Button>
              <span className="text-muted-foreground text-sm tabular-nums">
                {page} из {query.data.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= query.data.pages}
                onClick={() => setPage((current) => current + 1)}
              >
                Вперёд
                <ChevronRight aria-hidden />
              </Button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
