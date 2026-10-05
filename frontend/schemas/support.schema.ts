import { z } from "zod";

/** Support bubble: mirrors the backend CreateTicketDto (contact is
 * free-form — email or @telegram; the anti-spam limits live server-side,
 * same sliding-window model as the reviews). */
export const supportSchema = z.object({
  name: z.string().trim().max(40, "Не длиннее 40 символов").optional(),
  contact: z
    .string()
    .trim()
    .min(3, "Укажите email или @telegram для ответа")
    .max(200, "Не длиннее 200 символов"),
  message: z
    .string()
    .trim()
    .min(10, "Минимум 10 символов")
    .max(2000, "Не длиннее 2000 символов"),
});

export type SupportValues = z.infer<typeof supportSchema>;
