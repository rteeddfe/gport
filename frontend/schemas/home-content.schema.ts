import { z } from "zod";

/** Homepage hero content (admin). Exactly four advantage tiles, like the
 * storefront block. */
export const homeContentSchema = z.object({
  kicker: z.string().trim().min(1, "Укажите кикер").max(100),
  title: z.string().trim().min(1, "Укажите заголовок").max(200),
  titleAccent: z.string().trim().min(1, "Укажите акцент").max(200),
  subtitle: z.string().trim().max(500).optional(),
  ctaLabel: z.string().trim().min(1, "Укажите текст кнопки").max(100),
  ctaHref: z.string().trim().min(1, "Укажите ссылку кнопки").max(300),
  tiles: z
    .array(z.string().trim().min(1, "Тезис не может быть пустым").max(200))
    .length(4, "Ровно четыре тезиса"),
});

export type HomeContentValues = z.infer<typeof homeContentSchema>;
