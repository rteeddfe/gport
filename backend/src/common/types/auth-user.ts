import type { Role } from '../../generated/prisma/client.js';
import type { AdminPermission } from '../constants/admin-permissions.js';

/** Shape attached to `request.user` by the JWT strategy. Permissions are
 * reloaded from the database on every request, so grants/revocations take
 * effect immediately — the JWT payload never carries them. */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  permissions: AdminPermission[];
}
