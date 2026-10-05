import type { OrderStatus } from "@/types/api";

/** Shared order display vocabulary — the user ЛК and the admin table were
 * maintaining two divergent copies (labels and provider names drifted). */

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  AWAITING_PAYMENT: { label: "Ожидает оплаты", variant: "secondary" },
  PAID: { label: "Оплачен", variant: "default" },
  CANCELLED: { label: "Отменён", variant: "destructive" },
};

export const PROVIDER_LABELS: Record<string, string> = {
  test: "Тестовый магазин",
};
