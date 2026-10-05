import { z } from "zod";

/** Homepage hero content (admin). Exactly four advantage tiles, like the
 * storefront block, plus the wall cards and the hero cylinder cards
 * (image + link each; empty lists = built-in fallbacks on the
 * storefront). */
const cardSchema = z.object({
  imageUrl: z.string().trim().min(1, "Загрузите изображение").max(500),
  href: z.string().trim().min(1, "Укажите ссылку").max(300),
});

/** A home-block service: a picked top-up product (+ optional mini logo). */
const serviceRefSchema = z.object({
  productId: z.string().min(1, "Выберите сервис"),
  iconUrl: z.string().trim().max(500).optional(),
});

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
  wallCards: z.array(cardSchema).max(12, "Не больше 12 карточек"),
  carouselCards: z.array(cardSchema).max(12, "Не больше 12 карточек"),
  /** Services of the home top-up form (block 2). */
  topupServices: z.array(serviceRefSchema).max(8, "Не больше 8 сервисов"),
  /** Services of the service wall (block 3). */
  serviceCards: z.array(serviceRefSchema).max(7, "Не больше 7 карточек"),
});

export type HomeContentValues = z.infer<typeof homeContentSchema>;
