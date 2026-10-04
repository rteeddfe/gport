import { SetMetadata } from '@nestjs/common';
import type { AdminPermission } from '../constants/admin-permissions.js';

export const PERMISSIONS_KEY = 'admin_permissions';

/** Admin routes that additionally require these permissions on top of
 * @Roles(Role.ADMIN). SUPER_ADMIN bypasses the check (RolesGuard). */
export const RequirePermissions = (
  ...permissions: AdminPermission[]
): ReturnType<typeof SetMetadata> => SetMetadata(PERMISSIONS_KEY, permissions);
