import { z } from "zod";

/** Homepage hero content (admin). The store ships blank: every text may
 * be empty (empty fields simply do not render), up to four advantage
 * tiles, plus the wall cards and the hero cylinder cards (image + link
 * each). */
const cardSchema = z.object({
  imageUrl: z.string().trim().min(1, "Загрузите изображение").max(500),
  href: z.string().trim().min(1, "Укажите ссылку").max(300),
});

/** A home-block service: a picked top-up product (+ optional mini logo). */
const serviceRefSchema = z.object({
  productId: z.string().min(1, "Выберите сервис"),
  iconUrl: z.string().trim().max(500).optional(),
});

/** One stat card of the trust block before the news. */
const statCardSchema = z.object({
  label: z.string().trim().max(100),
  prefix: z.string().trim().max(50),
  value: z.string().trim().max(50),
  description: z.string().trim().max(100),
});

/** One community card of the trust block. */
const communityCardSchema = z.object({
  brand: z.enum(["telegram", "vk"]),
  name: z.string().trim().max(100),
  description: z.string().trim().max(300),
  usersCount: z.string().trim().max(50),
  usersLabel: z.string().trim().max(100),
  url: z.string().trim().max(300),
});

export const homeContentSchema = z.object({
  kicker: z.string().trim().max(100),
  title: z.string().trim().max(200),
  titleAccent: z.string().trim().max(200),
  subtitle: z.string().trim().max(500).optional(),
  /** Primary CTA (filled style); empty = the button does not render. */
  ctaPrimaryLabel: z.string().trim().max(100),
  ctaPrimaryHref: z.string().trim().max(300),
  /** Secondary CTA (outline style); empty = hidden. */
  ctaLabel: z.string().trim().max(100),
  ctaHref: z.string().trim().max(300),
  tiles: z
    .array(z.string().trim().max(200))
    .max(4, "Не больше четырёх тезисов"),
  wallCards: z.array(cardSchema).max(12, "Не больше 12 карточек"),
  carouselCards: z.array(cardSchema).max(12, "Не больше 12 карточек"),
  /** Services of the home top-up form (block 2). */
  topupServices: z.array(serviceRefSchema).max(8, "Не больше 8 сервисов"),
  /** Services of the service wall (block 3). */
  serviceCards: z.array(serviceRefSchema).max(7, "Не больше 7 карточек"),
  /** Trust block before the news. */
  statCards: z.array(statCardSchema).max(2, "Не больше двух карточек"),
  communityLabel: z.string().trim().max(100),
  communityCards: z.array(communityCardSchema).max(2, "Не больше двух карточек"),
});

export type HomeContentValues = z.infer<typeof homeContentSchema>;
