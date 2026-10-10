import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatPrice } from "@/lib/format";
import { SYSREQ_ROWS } from "@/lib/system-requirements";
import { getListValues } from "@/services/list-values.service";
import { getFallbackLogo } from "@/services/settings.service";
import { CheckoutForm } from "@/features/products/components/checkout-form";
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

/** Public product page (PUBLISHED only, enforced by the API): a blurred
 * backdrop from the cover art limited to the first screen, then two
 * blocks — the product card (gallery, key facts, description, activation,
 * FAQ) and the sticky inline checkout (no popup) — then related products. */
export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [product, listValues] = await Promise.all([
    getProductDetail(slug).catch(() => null),
    getListValues().catch(() => []),
  ]);
  if (!product) notFound();
  const logoUrl = await getFallbackLogo();

  /** Display name of a stored registry slug (falls back to the raw slug
   * when the value was removed from the registry). */
  const listName = (kind: string, slugValue: string): string =>
    listValues.find((value) => value.kind === kind && value.slug === slugValue)
      ?.name ?? slugValue;

  const discount = discountPercent(product.priceCents, product.oldPriceCents);
  const isKey = product.kind === "GAME_KEY";
  const inStock = product.stock > 0;
  const cover = product.images[0] ?? null;
  const attributes = [
    product.platform
      ? { label: "Платформа", value: listName("platform", product.platform) }
      : null,
    product.genre.length > 0
      ? { label: "Жанры", value: product.genre.map((g) => listName("genre", g)).join(", ") }
      : null,
    product.releaseYear != null
      ? { label: "Год выхода", value: product.releaseYear.toString() }
      : null,
    product.consoles.length > 0
      ? { label: "Консоли", value: product.consoles.map((c) => listName("consoles", c)).join(", ") }
      : null,
  ].filter(
    (attribute): attribute is { label: string; value: string } =>
      attribute !== null && Boolean(attribute.value),
  );

  return (
    <div className="relative">
      {/* Blurred backdrop from the cover art, pulled up to the very top
          of the viewport (the header is fixed and floats above it) and
          limited to the first screen. A tall gradient under the image
          blends it into the page background. Absolute — it scrolls away
          with the page (the template's entrance filter makes
          position:fixed unreliable here). */}
      <div
        aria-hidden
        className="absolute inset-x-0 -top-20 -z-10 h-[100svh] overflow-hidden"
      >
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            // Decorative and blurred by CSS — low quality, no priority:
            // it must not compete with the product card for bandwidth.
            quality={30}
            sizes="100vw"
            className="scale-110 object-cover blur-[5px]"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(52rem_34rem_at_12%_-8%,rgb(139_92_246/0.18),transparent_62%),radial-gradient(44rem_30rem_at_88%_12%,rgb(85_221_229/0.12),transparent_60%)]" />
        )}
        <div className="bg-canvas/75 absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-canvas" />
      </div>

      <Container className="py-8">
        <nav
          aria-label="Хлебные крошки"
          className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm"
        >
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

        {/* Two blocks: the product card on the left (gallery, key facts,
            description, activation, FAQ), the checkout on the right — it
            sticks to the viewport bottom while the page scrolls. Related
            products follow below, spanning both columns. */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:items-start">
          <div className="border-border bg-surface/90 rounded-3xl border p-4 backdrop-blur sm:p-6">
            {/* Top row: gallery on the left, key facts on the right. */}
            <div className="grid gap-6 sm:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
              <div>
                <ProductGallery images={product.images} title={product.title} logoUrl={logoUrl} />
              </div>

              <div>
                {product.category ? (
                <Badge variant="secondary" className="mb-3">
                  {product.category.name}
                </Badge>
              ) : null}
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {product.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-baseline gap-3">
                {/* Top-ups quote a «from» price (nominals / amount range);
                    key products show the fixed price. */}
                <span className="text-gradient text-2xl font-bold tabular-nums sm:text-3xl">
                  {isKey ? null : <span className="text-lg sm:text-xl">от </span>}
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

              {isKey ? (
                <p
                  className={
                    inStock
                      ? "text-neon mt-2 text-sm font-medium"
                      : "text-destructive mt-2 text-sm font-medium"
                  }
                >
                  {inStock ? `В наличии: ${product.stock} шт.` : "Нет в наличии"}
                </p>
              ) : null}

              {/* Key facts as a list: one row per fact, in the info column
                  to the right of the gallery. */}
              {attributes.length > 0 ? (
                <dl className="border-border mt-5 grid grid-cols-1 gap-y-3 border-t pt-5">
                  {attributes.map((attribute) => (
                    <div
                      key={attribute.label}
                      className="flex items-baseline justify-between gap-4"
                    >
                      <dt className="text-muted-foreground text-sm">
                        {attribute.label}
                      </dt>
                      <dd className="text-sm font-medium">{attribute.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              </div>
            </div>

            {product.instruction ? (
              <section className="border-border mt-6 border-t pt-6">
                <h2 className="text-lg font-semibold">Как активировать</h2>
                <p className="text-muted-foreground mt-3 whitespace-pre-line text-sm leading-relaxed">
                  {product.instruction}
                </p>
              </section>
            ) : null}

            {product.description ? (
              <section className="border-border mt-6 border-t pt-6">
                <h2 className="text-lg font-semibold">Описание</h2>
                <p className="text-muted-foreground mt-3 whitespace-pre-line text-sm leading-relaxed">
                  {product.description}
                </p>
              </section>
            ) : null}

            {/* PC system requirements (games): the two old-store cards —
                only filled rows, hidden entirely when nothing is set
                (console games have no PC requirements by design). */}
            {product.systemRequirements?.minimum ||
            product.systemRequirements?.recommended ? (
              <section className="border-border mt-6 border-t pt-6">
                <h2 className="text-lg font-semibold">Системные требования</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {(["minimum", "recommended"] as const).map((tier) => {
                    const rows = product.systemRequirements?.[tier];
                    if (!rows) return null;
                    return (
                      <div
                        key={tier}
                        className="border-border bg-canvas/60 rounded-2xl border p-5"
                      >
                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                          {tier === "minimum" ? "Минимальные" : "Рекомендуемые"}
                        </p>
                        <dl className="mt-4 space-y-3 text-sm">
                          {SYSREQ_ROWS.map(({ key, label }) => {
                            const value = rows[key];
                            if (!value) return null;
                            return (
                              <div
                                key={key}
                                className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                              >
                                <dt className="text-muted-foreground shrink-0">
                                  {label}
                                </dt>
                                <dd className="font-medium sm:text-right">
                                  {value}
                                </dd>
                              </div>
                            );
                          })}
                        </dl>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {product.faq.length > 0 ? (
              <section className="border-border mt-6 border-t pt-6">
                <h2 className="text-lg font-semibold">Частые вопросы</h2>
                <Accordion type="single" collapsible className="mt-2">
                  {product.faq.map((item, index) => (
                    <AccordionItem
                      key={`${item.question}-${index}`}
                      value={`faq-${index}`}
                    >
                      <AccordionTrigger className="text-sm font-semibold">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ) : null}
          </div>

          <CheckoutForm
            product={{
              id: product.id,
              title: product.title,
              priceCents: product.priceCents,
              stock: product.stock,
              kind: product.kind,
              minValue: product.minValue,
              maxValue: product.maxValue,
              commissionPercent: product.commissionPercent,
              creditingMode: product.creditingMode,
              accountFieldKind: product.accountFieldKind,
              accountFieldLabel: product.accountFieldLabel,
              accountFieldHint: product.accountFieldHint,
              variants: product.variants,
            }}
          />
        </div>

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
                logoUrl={logoUrl}
              />
            </div>
          </section>
        ) : null}
      </Container>
    </div>
  );
}
