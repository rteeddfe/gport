import { Reflector } from '@nestjs/core';
import { Role } from '../generated/prisma/client.js';
import type { AdminPermission } from '../common/constants/admin-permissions.js';
import { ROLES_KEY } from '../common/decorators/roles.decorator.js';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { AdminIntegrationsController } from './admin-integrations.controller.js';

/**
 * M-INTEGRATIONS-1 authorization boundary: reading is ADMIN + «integrations»
 * (sanitized view only), every mutation is SUPER_ADMIN-only. Verified through
 * the route metadata the global RolesGuard actually reads (same style as
 * admin-products.controller.spec.ts).
 */
describe('AdminIntegrationsController RBAC', () => {
  const controller = new AdminIntegrationsController(null as never);
  const reflector = new Reflector();
  const rolesOf = (handler: string): unknown =>
    reflector.getAllAndOverride(ROLES_KEY, [
      (controller as never)[handler as never],
      controller.constructor,
    ]);
  const permissionsOf = (handler: string): unknown =>
    reflector.getAllAndOverride(PERMISSIONS_KEY, [
      (controller as never)[handler as never],
      controller.constructor,
    ]);

  const guardFor = (
    handler: 'list' | 'find' | 'update' | 'remove' | 'removeSecret',
    user: { role: Role; permissions: AdminPermission[] },
  ) => {
    const guard = new RolesGuard(reflector);
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => (controller as never)[handler as never],
      getClass: () => AdminIntegrationsController,
    } as never;
    return guard.canActivate(context);
  };

  it('GET routes stay ADMIN + integrations (SUPER_ADMIN bypasses as always)', () => {
    expect(rolesOf('list')).toEqual([Role.ADMIN]);
    expect(rolesOf('find')).toEqual([Role.ADMIN]);
    expect(permissionsOf('list')).toEqual(['integrations']);
    expect(permissionsOf('find')).toEqual(['integrations']);
  });

  it('mutation routes are SUPER_ADMIN-only with no permission shortcut', () => {
    for (const handler of ['update', 'remove', 'removeSecret']) {
      expect(rolesOf(handler)).toEqual([Role.SUPER_ADMIN]);
      expect(permissionsOf(handler)).toBeUndefined();
    }
  });

  it('an ADMIN with the integrations permission may read (sanitized) but never mutate', () => {
    const admin = { role: Role.ADMIN, permissions: ['integrations'] as AdminPermission[] };
    expect(guardFor('list', admin)).toBe(true);
    expect(guardFor('update', admin)).toBe(false);
    expect(guardFor('remove', admin)).toBe(false);
    expect(guardFor('removeSecret', admin)).toBe(false);
  });

  it('an ADMIN without the integrations permission is rejected', () => {
    const admin = { role: Role.ADMIN, permissions: [] as AdminPermission[] };
    expect(guardFor('list', admin)).toBe(false);
  });

  it('a USER has no access at all', () => {
    const user = { role: Role.USER, permissions: ['integrations'] as AdminPermission[] };
    expect(guardFor('list', user)).toBe(false);
  });
});
