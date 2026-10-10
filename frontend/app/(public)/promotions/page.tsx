import { Container } from "@/components/layout/container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/api/errors";
import { getFallbackLogo } from "@/services/settings.service";
import { getProducts } from "@/services/products.service";
import { ProductRevealGrid } from "@/features/products/components/product-reveal-grid";
import type { Product } from "@/types/api";

export const metadata = { title: "Акции" };

/**
 * Promotions: every published product that carries a discount
 * (`oldPriceCents` above the current price — the badge and struck-through
 * price render on the shared card). No promotions entity exists yet, so
 * discounts come straight from product data; when a promotions backend
 * is approved this page moves behind it.
 *
 * Promo codes are deliberately NOT listed here (or anywhere public): they
 * are distributed off-site (ads, mailings), so the storefront must not
 * enumerate them — the only public touchpoint is entering a code in the
 * cart, and the source of truth is the admin panel.
 */
export default async function PromotionsPage() {
  const logoUrl = await getFallbackLogo();
  let items: Product[] = [];
  let errorMessage: string | null = null;

  try {
    const result = await getProducts({ limit: 100, sort: "new" });
    items = result.items.filter(
      (product) => product.oldPriceCents && product.oldPriceCents > product.priceCents,
    );
  } catch (error) {
    errorMessage = getErrorMessage(error);
  }

  return (
    <Container className="py-12">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon">Акции</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Акции и <span className="text-gradient">скидки</span>
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
          Выгодные цены на цифровые товары — скидка уже в цене.
        </p>
      </header>

      <div className="mt-8">
        {errorMessage ? (
          <ErrorState title="Не удалось загрузить акции" message={errorMessage} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Акций пока нет"
            description="Следите за новостями — скидки появляются регулярно."
          />
        ) : (
          <ProductRevealGrid
            items={items}
            columnsClass="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            logoUrl={logoUrl}
          />
        )}
      </div>
    </Container>
  );
}
