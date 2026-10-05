/** Admin tab permissions granted to ADMIN accounts (checkboxes in
 * /admin/users). One value per admin domain; «products» covers both the
 * products and the categories tabs. USER ignores the list, SUPER_ADMIN
 * bypasses it — see RolesGuard. */
export const ADMIN_PERMISSIONS = [
  'products',
  'orders',
  'files',
  'posts',
  'reviews',
  'promo-codes',
  'support',
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export function isAdminPermission(value: unknown): value is AdminPermission {
  return (
    typeof value === 'string' &&
    (ADMIN_PERMISSIONS as readonly string[]).includes(value)
  );
}
