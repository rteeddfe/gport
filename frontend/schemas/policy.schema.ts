import { z } from "zod";

/** Admin policy-page editor («Юр. информация»). Content is rich-text HTML
 * from the Tiptap editor; the backend sanitizes it against a whitelist. */
export const policySchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Строчные латинские буквы, цифры и дефисы",
    )
    .max(100),
  title: z.string().trim().min(1, "Укажите заголовок").max(200),
  content: z.string().max(200_000),
});

export type PolicyValues = z.infer<typeof policySchema>;
