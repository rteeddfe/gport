import { z } from "zod";

/** FAQ constructor entry (admin). Category whitelist matches the
 * storefront filter chips. */
export const faqItemSchema = z.object({
  question: z.string().trim().min(1, "Укажите вопрос").max(300),
  answer: z.string().trim().min(1, "Укажите ответ").max(2000),
  category: z.enum(["topup", "games"]),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean(),
});

export type FaqItemValues = z.infer<typeof faqItemSchema>;
