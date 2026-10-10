/**
 * Hero content contract, shared by the desktop hero banner and the
 * mobile first-screen preview (/design/hero-mobile). Texts are managed
 * from the admin panel (GET /home-content); carouselCards are the hero
 * cylinder's image+link cards. Everything is optional — empty fields do
 * not render (the store ships blank; the fallback below is the API-down
 * placeholder, equally blank).
 */
export interface HeroBannerContent {
  kicker: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  /** Primary CTA (filled style, wallet icon); empty = button hidden. */
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  /** Secondary CTA (outline style, gamepad icon); empty = hidden. */
  ctaLabel: string;
  ctaHref: string;
  tiles: string[];
  carouselCards: { imageUrl: string; href: string }[];
}

export const HERO_DEFAULT_CONTENT: HeroBannerContent = {
  kicker: "",
  title: "",
  titleAccent: "",
  subtitle: "",
  ctaPrimaryLabel: "",
  ctaPrimaryHref: "",
  ctaLabel: "",
  ctaHref: "",
  tiles: [],
  carouselCards: [],
};
