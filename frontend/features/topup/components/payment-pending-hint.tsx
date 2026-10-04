import { cn } from "@/lib/utils";

/** Honest "no payments yet" status shown after a valid pay click — the
 * payments business process is not approved, so there is no request. */
export function PaymentPendingHint({ className }: { className?: string }) {
  return (
    <p role="status" className={cn("text-sm text-neon", className)}>
      Оплата появится после подключения платёжного провайдера — бизнес-процесс
      платежей ещё не подключён.
    </p>
  );
}
