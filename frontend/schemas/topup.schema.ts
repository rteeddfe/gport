import { z } from "zod";

/** Client-side top-up form. The payment business process is not approved
 * yet — the widget validates and computes the total only; no request is
 * made and the pay button surfaces a "coming later" hint. */
export const topupSchema = z.object({
  login: z
    .string()
    .trim()
    .min(3, "Минимум 3 символа")
    .max(64, "Не длиннее 64 символов"),
  country: z.enum(["Россия", "Беларусь", "Казахстан", "Армения"]),
  amount: z
    .string()
    .trim()
    .regex(/^\d+$/, "Только цифры")
    .refine((value) => Number(value) >= 50, "Минимум 50 ₽")
    .refine((value) => Number(value) <= 15_000, "Максимум 15 000 ₽"),
  promo: z.string().trim().max(32, "Не длиннее 32 символов").optional(),
});

export type TopupValues = z.infer<typeof topupSchema>;
