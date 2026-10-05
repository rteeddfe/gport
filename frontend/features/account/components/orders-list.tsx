"use client";

import { useQuery } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatPrice } from "@/lib/format";
import { ORDER_STATUS_META, PROVIDER_LABELS } from "@/lib/order-labels";
import { getMyOrders } from "@/services/orders.service";
import type { OrderView } from "@/types/api";

function OrderCard({ order }: { order: OrderView }) {
  const status = ORDER_STATUS_META[order.status];
  return (
    <article className="border-border bg-surface rounded-2xl border p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            № {order.id.slice(0, 8)} · {formatDateTime(order.createdAt)}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {PROVIDER_LABELS[order.provider] ?? order.provider}
          </p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </header>

      <ul className="mt-4 space-y-3">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-3">
            <Link
              href={`/products/${item.productSlug}`}
              className="bg-canvas border-border relative block size-16 shrink-0 overflow-hidden rounded-lg border"
            >
              {item.productImage ? (
                <Image
                  src={item.productImage}
                  alt={item.productTitle}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : null}
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/products/${item.productSlug}`}
                className="text-sm font-medium hover:underline"
              >
                {item.productTitle}
              </Link>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {item.variantLabel
                  ? `${item.variantLabel} · ${formatPrice(item.unitPriceCents)}`
                  : `${item.quantity} × ${formatPrice(item.unitPriceCents)}`}
              </p>
              {item.accountIdentifier ? (
                <p className="mt-0.5 text-xs">
                  Аккаунт:{" "}
                  <span className="font-mono">{item.accountIdentifier}</span>
                </p>
              ) : null}
              {item.keys.length > 0 ? (
                <div className="border-brand/30 bg-brand/5 mt-2 rounded-lg border p-2.5">
                  <p className="text-brand-bright flex items-center gap-1.5 text-xs font-semibold">
                    <KeyRound className="size-3.5" aria-hidden />
                    Ключи
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {item.keys.map((key) => (
                      <li key={key} className="font-mono text-xs break-all">
                        {key}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : order.status === "PAID" && item.instruction ? (
                <p className="text-muted-foreground mt-2 rounded-lg border border-dashed border-border p-2.5 text-xs leading-relaxed">
                  {item.instruction}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <p className="border-border mt-4 flex items-center justify-between border-t pt-3 text-sm">
        <span className="text-muted-foreground">Итого</span>
        <span className="font-bold tabular-nums">
          {formatPrice(order.totalCents)}
        </span>
      </p>
    </article>
  );
}

/** The buyer's order history — direct purchases with their delivered
 * keys (or the activation instruction for key-less products). */
export function OrdersList() {
  const query = useQuery({ queryKey: ["my-orders"], queryFn: () => getMyOrders() });

  if (query.isPending) {
    return (
      <div className="mt-8 space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <p className="text-destructive mt-8 text-sm">
        Не удалось загрузить заказы: {query.error.message}
      </p>
    );
  }
  if (query.data.length === 0) {
    return (
      <div className="border-border bg-surface mt-8 rounded-2xl border border-dashed p-10 text-center">
        <p className="font-medium">Заказов пока нет</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Выберите игру в{" "}
          <Link href="/products" className="text-neon hover:underline">
            каталоге
          </Link>{" "}
          — покупка занимает пару минут.
        </p>
      </div>
    );
  }
  return (
    <div className="mt-8 space-y-4">
      {query.data.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}
