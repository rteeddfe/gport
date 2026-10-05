"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useMe } from "@/features/auth/hooks/use-me";
import { formatPrice } from "@/lib/format";
import type { TestSessionView } from "@/types/api";

/**
 * The «terminal» of the test acquiring emulator. The buttons complete the
 * payment via the storefront's own route handler
 * (/api/payments/test/complete), which signs and posts the webhook to the
 * API exactly like a real acquirer's server would; the buyer then lands
 * in their orders.
 */
export function TestPayForm({
  session,
  token,
}: {
  session: TestSessionView;
  token: string;
}) {
  const router = useRouter();
  const { data: user } = useMe();
  const [pending, setPending] = useState<"success" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function complete(outcome: "success" | "cancel") {
    setPending(outcome);
    setError(null);
    try {
      const response = await fetch("/api/payments/test/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, outcome }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Ошибка подтверждения платежа");
      }
      // Signed-in buyers land in their orders; guests (email-only) go
      // back to the storefront — their keys are in the letter and will
      // follow the email after registration.
      router.push(user ? "/dashboard/orders" : "/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка");
      setPending(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-canvas border-border rounded-2xl border p-5">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">
          Карта (тестовая, без списания)
        </p>
        <p className="mt-3 font-mono text-lg tracking-[0.2em] text-foreground/90">
          4111 1111 1111 1111
        </p>
        <div className="text-muted-foreground mt-2 flex gap-8 text-xs">
          <span>12/29</span>
          <span>•••</span>
          <span>TEST</span>
        </div>
      </div>

      <Button
        size="lg"
        className="w-full text-sm font-semibold"
        disabled={pending !== null}
        onClick={() => void complete("success")}
      >
        {pending === "success" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <ShieldCheck className="size-4" aria-hidden />
        )}
        Оплатить {formatPrice(session.amountCents)}
      </Button>
      <Button
        variant="outline"
        className="w-full"
        disabled={pending !== null}
        onClick={() => void complete("cancel")}
      >
        Отменить платёж
      </Button>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
