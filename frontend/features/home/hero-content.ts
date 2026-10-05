/**
 * Hero content contract, shared by the desktop hero banner and the
 * mobile first-screen preview (/design/hero-mobile). Texts are managed
 * from the admin panel (GET /home-content); carouselCards are the hero
 * cylinder's image+link cards (empty = built-in placeholder covers).
 */
export interface HeroBannerContent {
  kicker: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  tiles: string[];
  carouselCards: { imageUrl: string; href: string }[];
}

export const HERO_DEFAULT_CONTENT: HeroBannerContent = {
  kicker: "Пополнение сервисов",
  title: "Пополняй любимые игры",
  titleAccent: "по выгодному курсу",
  subtitle: "",
  ctaLabel: "Каталог игр",
  ctaHref: "/products",
  tiles: [
    "Без ограничений, регистрации и верификации",
    "Без скрытых комиссий и платежей",
    "Моментальная доставка после оплаты",
    "Много способов оплаты",
  ],
  carouselCards: [],
};
