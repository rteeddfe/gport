import Image from "next/image";
import Link from "next/link";

import { cn } from "cn";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/types/api";

function discountPercent(product: Product): number | null {
  if (!product.oldPriceCents || product.oldPriceCents <= product.priceCents) {
    return null;
  }
  return Math.round((1 - product.priceCents / product.oldPriceCents) * 100);
}

/**
 * Shared product poster card (home «Игровые валюты», catalog,
 * promotions): portrait cover with the store logo on a neon wash as the
 * fallback (no letter), title, price and — when the product has one — a
 * struck-through old price and a violet discount badge. Whole card links
 * to the product page; hover = lift + brand glow (CSS only).
 */
export function ProductCard({
  product,
  sizes = "(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw",
}: {
  product: Product;
  sizes?: string;
}) {
  const cover = product.images[0];
  const discount = discountPercent(product);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block h-full overflow-hidden rounded-2xl border border-border bg-surface transition-[transform,translate,box-shadow] duration-200 hover:-translate-y-1 hover:glow-brand"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-canvas">
        {cover ? (
          <Image
            src={cover}
            alt={product.title}
            fill
            sizes={sizes}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 grid place-items-center bg-[radial-gradient(16rem_12rem_at_50%_20%,rgb(139_92_246/0.25),transparent_70%),radial-gradient(12rem_10rem_at_80%_90%,rgb(85_221_229/0.15),transparent_70%)]"
          >
            <Image
              src="/logo2.png"
              alt=""
              width={2400}
              height={1569}
              className="relative h-14 w-auto opacity-90"
            />
          </div>
        )}
        {discount !== null ? (
          <span className="absolute left-3 top-3 rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-white glow-brand">
            −{discount}%
          </span>
        ) : null}
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-medium" title={product.title}>
          {product.title}
        </h3>
        <p className={cn("mt-0.5 flex items-baseline gap-2 text-sm font-semibold tabular-nums")}>
          {formatPrice(product.priceCents)}
          {product.oldPriceCents ? (
            <span className="text-xs font-medium text-muted-foreground line-through">
              {formatPrice(product.oldPriceCents)}
            </span>
          ) : null}
        </p>
      </div>
    </Link>
  );
}
