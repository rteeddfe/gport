import {
  Activity,
  FolderTree,
  LayoutDashboard,
  MessageSquareQuote,
  Newspaper,
  Package,
  Percent,
  Plug,
  ReceiptText,
  Settings,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { AdminPermission, Role } from "@/types/api";

export interface AdminNavItem {
  href: string;
  label: string;
  /** Shown on the overview page's section cards. */
  description: string;
  icon: LucideIcon;
  /** ADMINs need this permission to see the item (SUPER_ADMIN always
   * does). Items without it are open to every admin role. */
  permission?: AdminPermission;
  /** Restricts the item to one role, e.g. user management to SUPER_ADMIN. */
  requiredRole?: Role;
}

/**
 * Sections of the admin panel. The visible subset is computed per session
 * by visibleAdminNavItems(): ADMINs see only the tabs their permissions
 * cover (products, posts, reviews, promo-codes — see backend
 * ADMIN_PERMISSIONS), while settings/analytics/users stay SUPER_ADMIN-only.
 * The filter is UX — the backend guard remains the source of truth.
 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Обзор",
    description: "Сводка по магазину и быстрые переходы по разделам",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/integrations",
    label: "Интеграции",
    description: "Вход через Яндекс ID / VK ID, Метрика, платёжные провайдеры и внешние сервисы",
    icon: Plug,
    requiredRole: "SUPER_ADMIN",
  },
  {
    href: "/admin/products",
    label: "Товары",
    description: "Каталог, цены, скидки и статусы публикации",
    icon: Package,
    permission: "products",
  },
  {
    href: "/admin/categories",
    label: "Категории",
    description: "Разделы каталога и их порядок",
    icon: FolderTree,
    permission: "products",
  },
  {
    href: "/admin/blog",
    label: "Блог",
    description: "Новости магазина: статьи, анонсы и публикации",
    icon: Newspaper,
    permission: "posts",
  },
  {
    href: "/admin/reviews",
    label: "Отзывы",
    description: "Модерация отзывов игроков с витрины",
    icon: MessageSquareQuote,
    permission: "reviews",
  },
  {
    href: "/admin/promo-codes",
    label: "Промокоды",
    description: "Скидочные коды, лимиты и сроки действия",
    icon: Percent,
    permission: "promo-codes",
  },
  {
    href: "/admin/support",
    label: "Обращения",
    description: "Сообщения из формы поддержки на витрине",
    icon: MessageSquareQuote,
    permission: "support",
  },
  {
    href: "/admin/orders",
    label: "Заказы",
    description: "Заказы покупателей: оплата, статусы и выдача",
    icon: ReceiptText,
  },
  {
    href: "/admin/store",
    label: "Магазин",
    description: "Оплата, эквайринг и исходящие письма",
    icon: Store,
    requiredRole: "SUPER_ADMIN",
  },
  {
    href: "/admin/users",
    label: "Пользователи",
    description: "Аккаунты, роли, права и сессии",
    icon: Users,
    requiredRole: "SUPER_ADMIN",
  },
  {
    href: "/admin/settings",
    label: "Настройки сайта",
    description: "Название, контакты и отображение магазина",
    icon: Settings,
    requiredRole: "SUPER_ADMIN",
  },
  {
    href: "/admin/health",
    label: "Состояние",
    description: "Доступность API и базы данных",
    icon: Activity,
  },
];
