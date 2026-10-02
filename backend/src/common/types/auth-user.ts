import type { Role } from '../../generated/prisma/client.js';

/** Shape attached to `request.user` by the JWT strategy. */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}
