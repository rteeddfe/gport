import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShoppingCart } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/features/products/components/product-card";
import { ProductGallery } from "@/features/products/components/product-gallery";
import { ProductRevealGrid } from "@/features/products/components/product-reveal-grid";
import { getProductDetail } from "@/services/products.service";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductDetail(slug).catch(() => null);
  if (!product) return { title: "Товар не найден" };
  return {
    title: product.title,
    description: product.description ?? undefined,
    ...(product.images[0] ? { openGraph: { images: [{ url: product.images[0] }] } } : {}),
  };
}

function discountPercent(priceCents: number, oldPriceCents: number | null): number | null {
  if (!oldPriceCents || oldPriceCents <= priceCents) return null;
  return Math.round((1 - priceCents / oldPriceCents) * 100);
}

/** Public product page (PUBLISHED only, enforced by the API): gallery,
 * price with discount, stock, game attributes, description, activation
 * instructions and related products from the same category. */
export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductDetail(slug).catch(() => null);
  if (!product) notFound();

  const discount = discountPercent(product.priceCents, product.oldPriceCents);
  const inStock = product.stock > 0;
  const attributes = [
    { label: "Регион", value: product.region },
    { label: "Платформа", value: product.platform },
    { label: "Жанры", value: product.genre.join(", ") },
    { label: "Локализация", value: product.localization },
    { label: "Возраст", value: product.ageRating },
  ].filter((attribute): attribute is { label: string; value: string } => Boolean(attribute.value));

  return (
    <Container className="py-12">
      <nav aria-label="Хлебные крошки" className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
        <Link href="/products" className="hover:text-brand">
          Каталог
        </Link>
        <span aria-hidden>/</span>
        {product.category ? (
          <>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="hover:text-brand"
            >
              {product.category.name}
            </Link>
            <span aria-hidden>/</span>
          </>
        ) : null}
        <span className="text-foreground">{product.title}</span>
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <ProductGallery images={product.images} title={product.title} />

        <div>
          {product.category ? (
            <Badge variant="secondary" className="mb-3">
              {product.category.name}
            </Badge>
          ) : null}
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {product.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="text-gradient text-3xl font-bold tabular-nums">
              {formatPrice(product.priceCents)}
            </span>
            {product.oldPriceCents ? (
              <>
                <span className="text-muted-foreground text-lg font-medium line-through tabular-nums">
                  {formatPrice(product.oldPriceCents)}
                </span>
                <span className="bg-brand text-white glow-brand rounded-full px-2.5 py-1 text-xs font-bold">
                  −{discount}%
                </span>
              </>
            ) : null}
          </div>

          <p
            className={
              inStock
                ? "text-neon mt-3 text-sm font-medium"
                : "text-destructive mt-3 text-sm font-medium"
            }
          >
            {inStock ? `В наличии: ${product.stock} шт.` : "Нет в наличии"}
          </p>

          <div className="border-border bg-surface mt-6 rounded-2xl border p-5">
            <div className="flex flex-wrap items-center gap-4">
              <Button disabled className="glow-brand gap-2">
                <ShoppingCart className="size-4" aria-hidden />
                В корзину
              </Button>
              <p className="text-muted-foreground text-xs">
                Корзина и оплата появятся позже — оформление покупок в
                разработке.
              </p>
            </div>
          </div>

          {attributes.length > 0 ? (
            <dl className="border-border mt-6 grid grid-cols-1 gap-x-8 gap-y-3 border-t pt-6 sm:grid-cols-2">
              {attributes.map((attribute) => (
                <div key={attribute.label} className="flex items-baseline justify-between gap-4">
                  <dt className="text-muted-foreground text-sm">{attribute.label}</dt>
                  <dd className="text-sm font-medium">{attribute.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>

      {product.description ? (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-lg font-semibold">Описание</h2>
          <p className="text-muted-foreground mt-3 whitespace-pre-line text-sm leading-relaxed">
            {product.description}
          </p>
        </section>
      ) : null}

      {product.instruction ? (
        <section className="border-brand/30 bg-surface mt-8 max-w-3xl rounded-2xl border p-6">
          <h2 className="text-lg font-semibold">Как активировать</h2>
          <p className="text-muted-foreground mt-3 whitespace-pre-line text-sm leading-relaxed">
            {product.instruction}
          </p>
        </section>
      ) : null}

      {product.related.length > 0 ? (
        <section className="mt-14">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold">Похожие товары</h2>
            <Link
              href={product.category ? `/products?category=${product.category.slug}` : "/products"}
              className="text-neon text-sm hover:underline"
            >
              Весь раздел
            </Link>
          </div>
          <div className="mt-6">
            <ProductRevealGrid
              items={product.related}
              columnsClass="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            />
          </div>
        </section>
      ) : null}
    </Container>
  );
}
