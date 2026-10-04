import type { ReactNode } from "react";

/** Top-up service tile data, shared by the home wall and the /topup
 * page. Prices are presentation data — the services are not products
 * in the database yet. */
export type Service = {
  name: string;
  priceFrom: number;
  /** Art backdrop: solid brand color or gradient (service imagery). */
  background: string;
  /** Hover glow, in the service's own color. */
  glow: string;
  /** Brand mark: static SVG from /brands, or custom markup. */
  icon?: string;
  iconNode?: ReactNode;
};

export const SERVICES: Service[] = [
  {
    name: "PlayStation",
    priceFrom: 291,
    background: "#113ca5",
    glow: "rgb(17 60 165 / 0.55)",
    icon: "/brands/playstation.svg",
  },
  {
    name: "Battle.net",
    priceFrom: 488,
    background: "#1479fe",
    glow: "rgb(20 121 254 / 0.55)",
    icon: "/brands/battledotnet.svg",
  },
  {
    name: "Nintendo",
    priceFrom: 506,
    background: "#e60012",
    glow: "rgb(230 0 18 / 0.5)",
    iconNode: (
      // em-based pill: it inherits the font-size set by the consumer
      // (ServiceMark scale, wall tile), so it fits any box without a
      // transform-scale overflow.
      <span className="rounded-full border-[0.2em] border-current px-[0.85em] py-[0.12em] font-extrabold tracking-tight text-white">
        Nintendo
      </span>
    ),
  },
  {
    name: "Apple ID",
    priceFrom: 20,
    // White apple on Apple's own near-black — the logo file is shared
    // with the top-up widget, where tiles are dark.
    background: "#1d1d1f",
    glow: "rgb(29 29 31 / 0.55)",
    icon: "/brands/apple.svg",
  },
  {
    name: "Telegram Premium",
    priceFrom: 1447,
    background: "linear-gradient(180deg, #be4bea 0%, #4e7df2 100%)",
    glow: "rgb(190 75 234 / 0.55)",
    icon: "/brands/telegram.svg",
  },
  {
    name: "Telegram Stars",
    priceFrom: 91,
    background: "linear-gradient(180deg, #ffd44f 0%, #ffa21e 100%)",
    glow: "rgb(255 162 30 / 0.55)",
    icon: "/brands/telegram-stars.svg",
  },
];
