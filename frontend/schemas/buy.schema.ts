import { z } from "zod";

import type { ProductKind } from "@/types/api";

/** The checkout panel on the product page: receipt email and the payment
 * method are common; the product kind adds its own fields — quantity
 * (keys), a chosen nominal (variantId) or an entered amount (clamped to
 * the product's range), and the account identifier for top-ups. The
 * quantity field registers with valueAsNumber, so the schema input is
 * already a number. */
export function createBuySchema(
  kind: ProductKind,
  accountLabel: string,
  range?: { min: number; max: number },
) {
  return z.object({
    quantity: z
      .number()
      .int("Целое число")
      .min(1, "Минимум 1")
      .max(10, "Не больше 10 за раз"),
    email: z.email("Введите корректный email"),
    provider: z.string().min(1, "Выберите способ оплаты"),
    /** Optional promo code — validated by the «Применить» check before
     * submit; the backend re-validates against the final subtotal. */
    promo: z
      .string()
      .trim()
      .max(40, "Не длиннее 40 символов")
      .regex(/^$|^[A-Za-z0-9_-]+$/, "Промокод: латиница, цифры, «_» и «-»")
      .optional(),
    /** TOPUP_NOMINAL only. */
    variantId:
      kind === "TOPUP_NOMINAL"
        ? z.uuid("Выберите номинал")
        : z.string().optional(),
    /** TOPUP_AMOUNT only: the entered amount (kopecks). */
    amountCents:
      kind === "TOPUP_AMOUNT"
        ? z
            .number({ message: "Укажите сумму" })
            .int("Целое число")
            .min(range?.min ?? 1, "Сумма меньше минимума")
            .max(range?.max ?? 2_000_000_000, "Сумма больше максимума")
        : z.number().optional(),
    /** TOPUP_* only: the account to credit. */
    accountIdentifier:
      kind === "GAME_KEY"
        ? z.string().optional()
        : z
            .string()
            .trim()
            .min(1, accountLabel ? `Укажите ${accountLabel.toLowerCase()}` : "Заполните поле")
            .max(200, "Не длиннее 200 символов"),
  });
}

export type BuyValues = z.infer<ReturnType<typeof createBuySchema>>;
