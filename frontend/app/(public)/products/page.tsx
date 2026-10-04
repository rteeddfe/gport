import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Container } from "@/components/layout/container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api/errors";
import { getCategories } from "@/services/categories.service";
import { getProducts, type FindProductsParams } from "@/services/products.service";
import { CatalogFilters } from "@/features/products/components/catalog-filters";
import { ProductRevealGrid } from "@/features/products/components/product-reveal-grid";
import type { Category, Product } from "@/types/api";

export const metadata = { title: "Каталог" };

const PAGE_SIZE = 12;
const SORTS = new Set(["new", "price_asc", "price_desc"]);

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function asString(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function pageHref(current: Record<string, string>, page: number): string {
  const query = new URLSearchParams(current);
  if (page > 1) {
    query.set("page", String(page));
  } else {
    query.delete("page");
  }
  const qs = query.toString();
  return `/products${qs ? `?${qs}` : ""}`;
}

/**
 * Catalog: category chips / search / sorting live in the URL query and
 * are handled by the client `CatalogFilters`; this Server Component
 * reads the query, fetches through the service layer and renders the
 * grid + pagination.
 */
export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const category = asString(params.category);
  const search = asString(params.search);
  const sortParam = asString(params.sort);
  const sort = (SORTS.has(sortParam) ? sortParam : "new") as FindProductsParams["sort"];
  const page = Math.max(1, Number.parseInt(asString(params.page) || "1", 10) || 1);

  let categories: Category[] = [];
  let items: Product[] = [];
  let total = 0;
  let pages = 1;
  let errorMessage: string | null = null;

  try {
    const [cats, result] = await Promise.all([
      getCategories(),
      getProducts({
        categorySlug: category || undefined,
        search: search || undefined,
        sort,
        page,
        limit: PAGE_SIZE,
      }),
    ]);
    categories = cats;
    items = result.items;
    total = result.total;
    pages = Math.max(1, result.pages);
  } catch (error) {
    errorMessage = getErrorMessage(error);
  }

  const current = {
    ...(category ? { category } : {}),
    ...(search ? { search } : {}),
    ...(sortParam && SORTS.has(sortParam) ? { sort: sortParam } : {}),
  };

  return (
    <Container className="py-12">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon">Каталог</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Каталог <span className="text-gradient">цифровых товаров</span>
        </h1>
        {!errorMessage ? (
          <p className="text-muted-foreground mt-2 text-sm">
            {total > 0
              ? `${total.toLocaleString("ru-RU")} товаров — пополнения и цифровые товары`
              : "Пока пусто"}
          </p>
        ) : null}
      </header>

      <div className="mt-8">
        {errorMessage ? (
          <ErrorState title="Не удалось загрузить каталог" message={errorMessage} />
        ) : (
          <>
            <CatalogFilters categories={categories} />
            <div className="mt-8">
              {items.length === 0 ? (
                <EmptyState
                  title="Ничего не найдено"
                  description="Попробуйте изменить запрос или сбросить фильтры."
                />
              ) : (
                <ProductRevealGrid
                  items={items}
                  columnsClass="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                />
              )}
            </div>
            {pages > 1 ? (
              <nav
                aria-label="Постраничная навигация"
                className="mt-10 flex items-center justify-center gap-3"
              >
                <Button asChild variant="outline" size="sm" disabled={page <= 1}>
                  <Link
                    href={pageHref(current, page - 1)}
                    aria-disabled={page <= 1}
                    className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
                  >
                    <ChevronLeft aria-hidden />
                    Назад
                  </Link>
                </Button>
                <span className="text-muted-foreground text-sm tabular-nums">
                  {page} из {pages}
                </span>
                <Button asChild variant="outline" size="sm" disabled={page >= pages}>
                  <Link
                    href={pageHref(current, page + 1)}
                    aria-disabled={page >= pages}
                    className={page >= pages ? "pointer-events-none opacity-50" : undefined}
                  >
                    Вперёд
                    <ChevronRight aria-hidden />
                  </Link>
                </Button>
              </nav>
            ) : null}
          </>
        )}
      </div>
    </Container>
  );
}
