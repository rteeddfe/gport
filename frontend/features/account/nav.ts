import {
  LayoutDashboard,
  ShoppingBag,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface AccountNavItem {
  href: string;
  label: string;
  /** Shown on the overview page's section cards. */
  description: string;
  icon: LucideIcon;
}

/**
 * Buyer dashboard sections. Orders wait for the purchase business process;
 * achievements are a static showcase until an achievements API is approved;
 * the profile is read-only until a profile-update API is approved.
 */
export const ACCOUNT_NAV_ITEMS: AccountNavItem[] = [
  {
    href: "/dashboard",
    label: "Обзор",
    description: "Профиль и быстрые переходы по разделам",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/orders",
    label: "Заказы",
    description: "История покупок и их статусы",
    icon: ShoppingBag,
  },
  {
    href: "/dashboard/achievements",
    label: "Достижения",
    description: "Награды и прогресс за активность",
    icon: Trophy,
  },
  {
    href: "/dashboard/profile",
    label: "Профиль",
    description: "Личные данные аккаунта",
    icon: UserRound,
  },
];
