import { z } from "zod";

/** Mirrors the backend CreatePromoCodeDto (admin promo form). The PERCENT
 * value and FIXED ruble amounts stay strings in the form and are converted
 * in onSubmit; the backend re-validates everything. */
export const promoCodeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Минимум 3 символа")
      .max(40, "Не длиннее 40 символов")
      .regex(/^[A-Za-z0-9_-]+$/, "Только A-Z, 0–9, «_» и «-»")
      .transform((value) => value.toUpperCase()),
    discountType: z.enum(["PERCENT", "FIXED"]),
    /** PERCENT: 1..99, FIXED: rubles (kopecks in onSubmit). */
    value: z.string().trim().min(1, "Укажите величину скидки"),
    isActive: z.boolean(),
    /** datetime-local strings; "" = no window (sent as null). */
    startsAt: z.string(),
    endsAt: z.string(),
    maxUses: z.string().regex(/^$|^\d+$/, "Целое число или пусто"),
    minSubtotalRub: z
      .string()
      .regex(/^$|^\d+(?:[.,]\d{1,2})?$/, "Формат: 1500 или 1500.50"),
  })
  .superRefine((values, ctx) => {
    if (values.discountType === "PERCENT") {
      const percent = Number(values.value);
      if (!/^\d+$/.test(values.value) || percent < 1 || percent > 99) {
        ctx.addIssue({
          code: "custom",
          input: values.value,
          path: ["value"],
          message: "От 1 до 99",
        });
      }
    } else if (!/^\d+(?:[.,]\d{1,2})?$/.test(values.value)) {
      ctx.addIssue({
        code: "custom",
        input: values.value,
        path: ["value"],
        message: "Формат: 500 или 500.50",
      });
    }
    if (
      values.startsAt &&
      values.endsAt &&
      new Date(values.endsAt) <= new Date(values.startsAt)
    ) {
      ctx.addIssue({
        code: "custom",
        input: values.endsAt,
        path: ["endsAt"],
        message: "Окончание должно быть позже начала",
      });
    }
  });

export type PromoCodeFormValues = z.infer<typeof promoCodeSchema>;
