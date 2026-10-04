import { z } from "zod";

/** Placeholder submission flow: no support-tickets API exists yet — the
 * form is wired client-side (validation only) until the backend is approved. */
export const supportSchema = z.object({
  name: z.string().trim().max(40, "Не длиннее 40 символов").optional(),
  email: z.email("Введите корректный email"),
  question: z
    .string()
    .trim()
    .min(10, "Минимум 10 символов")
    .max(1000, "Не длиннее 1000 символов"),
});

export type SupportValues = z.infer<typeof supportSchema>;
