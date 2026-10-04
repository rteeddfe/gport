import type { ReactNode } from "react";

import { SERVICES } from "@/features/home/services-data";

/** Placeholder commission mirroring the reference widget (50 ₽ → 53 ₽);
 * the real fee model arrives with the payments business process. */
export const TOPUP_FEE_RATE = 0.06;

export const TOPUP_COUNTRIES = ["Россия", "Беларусь", "Казахстан", "Армения"] as const;

export type TopupCountry = (typeof TOPUP_COUNTRIES)[number];

/** Currency sign shown in the widget for the selected country. Presentation
 * only — the typed amount is not converted; real rates arrive with the
 * payments business process. */
export const COUNTRY_CURRENCIES: Record<TopupCountry, string> = {
  "Россия": "₽",
  "Беларусь": "Br",
  "Казахстан": "₸",
  "Армения": "֏",
};

const LOGIN_LABELS: Record<string, string> = {
  PlayStation: "ID PSN",
  "Battle.net": "Email Battle.net",
  Nintendo: "ID Nintendo",
  "Apple ID": "Apple ID",
  "Telegram Premium": "Юзернейм @telegram",
  "Telegram Stars": "Юзернейм @telegram",
};

export type TopupService = {
  name: string;
  priceFrom: number;
  icon?: string;
  iconNode?: ReactNode;
  loginLabel: string;
};

/** Services available in the top-up widget. Steam is widget-only for now —
 * it is not in the shared wall data (SERVICES) so the wall stays untouched. */
export const TOPUP_SERVICES: TopupService[] = [
  { name: "Steam", priceFrom: 50, icon: "/brands/steam.svg", loginLabel: "Логин Steam" },
  ...SERVICES.map<TopupService>((service) => ({
    name: service.name,
    priceFrom: service.priceFrom,
    icon: service.icon,
    iconNode: service.iconNode,
    loginLabel: LOGIN_LABELS[service.name] ?? `Логин ${service.name}`,
  })),
];

export function getTopupService(name: string): TopupService {
  return TOPUP_SERVICES.find((service) => service.name === name) ?? TOPUP_SERVICES[0]!;
}
