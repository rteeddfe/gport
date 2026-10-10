import { Container } from "@/components/layout/container";
import { getProducts } from "@/services/products.service";
import { CatalogGrid } from "./catalog-grid";

const MAX_CARDS = 11;

/**
 * A home catalog block over one product category: published products of
 * the category in the shared card grid. Server-fetched like the
 * /products page — if the API is down or the category has no published
 * products, the block renders nothing instead of an error box
 * (SystemStatus already surfaces the backend state below).
 */
export async function CatalogSection({
  categorySlug,
  kicker,
  title,
  moreHref,
  logoUrl = "",
}: {
  categorySlug: string;
  kicker: string;
  title: React.ReactNode;
  moreHref: string;
  /** Settings logo for the no-cover card fallback. */
  logoUrl?: string;
}) {
  let items: Awaited<ReturnType<typeof getProducts>>["items"] = [];
  try {
    const result = await getProducts({ categorySlug, limit: MAX_CARDS });
    items = result.items;
  } catch {
    return null;
  }
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="pb-16">
      <Container>
        <CatalogGrid
          items={items}
          kicker={kicker}
          title={title}
          moreHref={moreHref}
          logoUrl={logoUrl}
        />
      </Container>
    </section>
  );
}
