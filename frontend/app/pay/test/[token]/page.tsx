import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { TestPayForm } from "@/features/payments/components/test-pay-form";
import { formatPrice } from "@/lib/format";
import { getTestSession } from "@/services/payments.service";

export const metadata: Metadata = {
  title: "Тестовый эквайринг — GPort",
  robots: { index: false, follow: false },
};

/**
 * Emulated acquirer checkout (the «Тестовый магазин» payment method).
 * Lives OUTSIDE the (public) route group on purpose — no storefront
 * header/footer, like the hosted page of a real bank. The full chain is
 * real: session → payment page → signed webhook → order paid → letters
 * → auto-delivery keys; only the money is pretend.
 */
export default async function TestAcquiringPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getTestSession(token).catch(() => null);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="border-border bg-surface w-full max-w-md rounded-3xl border p-8 shadow-[0_10px_50px_-14px_rgba(139,92,246,0.45)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon">
              Тестовый эквайринг
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Эмуляция оплаты — деньги не списываются
            </p>
          </div>
          <span className="glow-brand border-brand/40 bg-brand/15 grid size-11 shrink-0 place-items-center rounded-2xl border">
            <ShieldCheck className="text-brand-bright size-5" aria-hidden />
          </span>
        </div>

        {session === null ? (
          <div className="mt-8">
            <h1 className="text-lg font-semibold">Платёж не найден</h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Сессия не существует или ссылка устарела.
            </p>
            <Link
              href="/"
              className="text-neon mt-4 inline-block text-sm hover:underline"
            >
              Вернуться в магазин
            </Link>
          </div>
        ) : session.status === "AWAITING_PAYMENT" ? (
          <div className="mt-6">
            <p className="text-muted-foreground text-sm">
              {session.description || "Заказ в магазине GPort"}
            </p>
            <p className="text-gradient mt-2 text-4xl font-bold tabular-nums">
              {formatPrice(session.amountCents)}
            </p>
            <div className="mt-6">
              <TestPayForm session={session} token={token} />
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <h1 className="text-lg font-semibold">
              {session.status === "PAID"
                ? "Платёж уже подтверждён"
                : "Платёж был отменён"}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {session.status === "PAID"
                ? "Ключи уже доступны в личном кабинете и в письме."
                : "Можно оформить заказ заново из карточки товара."}
            </p>
            <Link
              href="/dashboard/orders"
              className="text-neon mt-4 inline-block text-sm hover:underline"
            >
              Перейти к заказам
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
