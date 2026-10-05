import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { CheckoutForm } from "@/features/products/components/checkout-form";
import { getProductDetail, getProducts } from "@/services/products.service";

/** The service top-up page (/topup/[slug]): a customised variant of the
 * product page for account top-ups — blurred cover backdrop, description
 * on the left, the inline checkout on the right, the per-product FAQ and
 * similar services from the same category. Key-based products do not
 * belong here (they render on /products/[slug]). */
export default async function ServiceTopupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductDetail(slug).catch(() => null);
  if (!product || product.kind === "GAME_KEY") {
    notFound();
  }
  const related = await getProducts({
    categorySlug: product.category?.slug,
    limit: 8,
  }).catch(() => null);
  const cover = product.images[0] ?? null;

  return (
    <div className="relative">
      {/* Blurred backdrop from the cover art — the same language as the
          product page, lighter content (design.md, direct purchase). */}
      <div
        aria-hidden
        className="absolute inset-x-0 -top-20 -z-10 h-[100svh] overflow-hidden"
      >
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
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
          <Link href="/" className="hover:text-foreground transition-colors">
            Главная
          </Link>
          <span aria-hidden>/</span>
          <Link href="/topup" className="hover:text-foreground transition-colors">
            Пополнение сервисов
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">{product.title}</span>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-6">
            <div>
              <p className="text-brand-bright text-xs font-semibold tracking-widest uppercase">
                Пополнение сервиса
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {product.title}
              </h1>
              {product.minValue != null ? (
                <p className="text-neon mt-2 text-sm font-medium">
                  от {(product.minValue / 100).toLocaleString("ru-RU")} ₽
                </p>
              ) : null}
            </div>
            {product.description ? (
              <p className="text-foreground/85 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            ) : null}
            {product.instruction ? (
              <div className="border-border bg-surface/80 rounded-2xl border p-5">
                <h2 className="text-sm font-semibold">Как это работает</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed whitespace-pre-line">
                  {product.instruction}
                </p>
              </div>
            ) : null}
            {product.faq.length > 0 ? (
              <div className="space-y-2">
                {product.faq.map((item) => (
                  <details
                    key={item.question}
                    className="border-border bg-surface/80 group rounded-2xl border px-5 py-4"
                  >
                    <summary className="cursor-pointer list-none text-sm font-semibold">
                      {item.question}
                    </summary>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed whitespace-pre-line">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
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

        {related && related.items.filter((item) => item.id !== product.id).length > 0 ? (
          <section className="mt-12">
            <h2 className="text-xl font-bold">Похожие сервисы</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {related.items
                .filter((item) => item.id !== product.id)
                .slice(0, 4)
                .map((item) => (
                  <Link
                    key={item.id}
                    href={`/topup/${item.slug}`}
                    className="border-border bg-surface hover:border-brand/50 group overflow-hidden rounded-2xl border transition-colors"
                  >
                    <span className="bg-canvas relative block aspect-[16/10] overflow-hidden">
                      {item.images[0] ? (
                        <Image
                          src={item.images[0]}
                          alt=""
                          fill
                          sizes="(min-width:1024px) 25vw, 50vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : null}
                    </span>
                    <span className="block px-4 py-3">
                      <span className="block truncate text-sm font-semibold">
                        {item.title}
                      </span>
                      <span className="text-neon block text-xs font-medium">
                        от {((item.minValue ?? item.priceCents) / 100).toLocaleString("ru-RU")} ₽
                      </span>
                    </span>
                  </Link>
                ))}
            </div>
          </section>
        ) : null}
      </Container>
    </div>
  );
}
