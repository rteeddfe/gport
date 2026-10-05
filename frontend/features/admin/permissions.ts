import { ADMIN_NAV_ITEMS, type AdminNavItem } from "@/features/admin/nav";
import type { AdminPermission, AuthUser } from "@/types/api";

/** Russian labels for the permission checkboxes (user management) and the
 * permission badges (user list). Mirrors backend ADMIN_PERMISSIONS. */
export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, string> = {
  products: "Товары и категории",
  orders: "Заказы",
  files: "Файлы",
  posts: "Блог",
  reviews: "Отзывы",
  "promo-codes": "Промокоды",
  support: "Обращения",
};

export const ADMIN_PERMISSION_ORDER: AdminPermission[] = [
  "products",
  "orders",
  "files",
  "posts",
  "reviews",
  "promo-codes",
  "support",
];

/** Nav subset visible to the session: permission items need the matching
 * grant (SUPER_ADMIN bypasses), requiredRole items need the exact role. */
export function visibleAdminNavItems(
  user: Pick<AuthUser, "role" | "permissions">,
  items: AdminNavItem[] = ADMIN_NAV_ITEMS,
): AdminNavItem[] {
  return items.filter((item) => {
    if (item.requiredRole && user.role !== item.requiredRole) {
      return false;
    }
    if (item.permission && user.role !== "SUPER_ADMIN") {
      return user.permissions.includes(item.permission);
    }
    return true;
  });
}
