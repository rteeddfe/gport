import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../generated/prisma/client.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import type { AdminPermission } from '../constants/admin-permissions.js';
import type { AuthUser } from '../types/auth-user.js';

/**
 * Registered globally. Without @Roles()/@RequirePermissions() metadata every
 * authenticated user passes. With @Roles(...) users holding the required
 * role are allowed. With @RequirePermissions(...) an ADMIN must hold every
 * listed permission (checked against the permissions reloaded from the
 * database on every request, so grants/revocations apply immediately).
 * SUPER_ADMIN always passes: it has full administrative access and must
 * never depend on role metadata or stored permissions.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredPermissions = this.reflector.getAllAndOverride<
      AdminPermission[] | undefined
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    if (
      (requiredRoles === undefined || requiredRoles.length === 0) &&
      (requiredPermissions === undefined || requiredPermissions.length === 0)
    ) {
      return true;
    }
    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (user === undefined) {
      return false;
    }
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }
    if (requiredRoles !== undefined && requiredRoles.length > 0) {
      if (!requiredRoles.includes(user.role)) {
        return false;
      }
    }
    if (requiredPermissions !== undefined && requiredPermissions.length > 0) {
      if (user.role !== Role.ADMIN) {
        return false;
      }
      if (!requiredPermissions.every((p) => user.permissions.includes(p))) {
        return false;
      }
    }
    return true;
  }
}
