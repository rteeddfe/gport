import { Reflector } from '@nestjs/core';
import { Role } from '../generated/prisma/client.js';
import { ROLES_KEY } from '../common/decorators/roles.decorator.js';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { AdminAuditController } from './admin-audit.controller.js';

/**
 * M-AUDIT-1 authorization boundary: the audit log is SUPER_ADMIN-only
 * (ADMIN/USER get 403 through the global RolesGuard) and append-only —
 * the controller exposes ONLY the read route.
 */
describe('AdminAuditController RBAC', () => {
  const controller = new AdminAuditController(null as never);
  const reflector = new Reflector();
  const rolesOf = (handler: string): unknown =>
    reflector.getAllAndOverride(ROLES_KEY, [
      (controller as never)[handler as never],
      controller.constructor,
    ]);
  const guardFor = (
    handler: string,
    user: { role: string; permissions: string[] },
  ) => {
    const guard = new RolesGuard(reflector);
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => (controller as never)[handler as never],
      getClass: () => AdminAuditController,
    } as never;
    return guard.canActivate(context);
  };

  it('the only route is the SUPER_ADMIN-only list endpoint', () => {
    expect(rolesOf('findMany')).toEqual([Role.SUPER_ADMIN]);
  });

  it('carries no ADMIN permission shortcut (SUPER_ADMIN bypass only)', () => {
    expect(
      reflector.getAllAndOverride(PERMISSIONS_KEY, [
        (controller as never).findMany,
        controller.constructor,
      ]),
    ).toBeUndefined();
  });

  it('SUPER_ADMIN passes; ADMIN and USER are rejected', () => {
    expect(guardFor('findMany', { role: 'SUPER_ADMIN', permissions: [] })).toBe(true);
    expect(guardFor('findMany', { role: 'ADMIN', permissions: ['integrations'] })).toBe(false);
    expect(guardFor('findMany', { role: 'USER', permissions: [] })).toBe(false);
  });

  it('is append-only: no update/delete handlers exist on the controller', () => {
    const handlers = Object.getOwnPropertyNames(
      Object.getPrototypeOf(controller),
    ).filter((name) => name !== 'constructor');
    expect(handlers).toEqual(['findMany']);
  });
});
