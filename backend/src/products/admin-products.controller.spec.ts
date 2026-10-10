import { Reflector } from '@nestjs/core';
import { Role } from '../generated/prisma/client.js';
import type { AdminPermission } from '../common/constants/admin-permissions.js';
import { ROLES_KEY } from '../common/decorators/roles.decorator.js';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import {
  AdminProductKeysController,
  AdminProductsController,
} from './admin-products.controller.js';

/**
 * M-4 authorization boundary: raw ProductKey values are the sellable
 * goods — the keys routes must be reachable by SUPER_ADMIN only, while
 * the plain product CRUD stays ADMIN + «products». Verified through the
 * route metadata the global RolesGuard actually reads.
 */
describe('ProductKeys authorization boundary', () => {
  const keys = new AdminProductKeysController(null as never);
  const products = new AdminProductsController(null as never);
  // The guard reads metadata through Reflector (handler first, then
  // class) — the tests use the same path for fidelity.
  const reflector = new Reflector();
  const rolesOf = (handler: string, target: object): unknown =>
    reflector.getAllAndOverride(ROLES_KEY, [
      (target as never)[handler as never],
      target.constructor,
    ]);
  const permissionsOf = (handler: string, target: object): AdminPermission[] =>
    reflector.getAllAndOverride(PERMISSIONS_KEY, [
      (target as never)[handler as never],
      target.constructor,
    ]);

  it('the keys routes require SUPER_ADMIN', () => {
    expect(rolesOf('listKeys', keys)).toEqual([Role.SUPER_ADMIN]);
    expect(rolesOf('replaceKeys', keys)).toEqual([Role.SUPER_ADMIN]);
  });

  it('the keys routes carry no ADMIN permission requirement', () => {
    expect(permissionsOf('listKeys', keys)).toBeUndefined();
    expect(permissionsOf('replaceKeys', keys)).toBeUndefined();
  });

  it('plain product CRUD stays ADMIN + products', () => {
    expect(rolesOf('create', products)).toEqual([Role.ADMIN]);
    expect(rolesOf('update', products)).toEqual([Role.ADMIN]);
    expect(permissionsOf('create', products)).toEqual(['products']);
    expect(permissionsOf('remove', products)).toEqual(['products']);
  });

  it('an ADMIN with the products permission cannot pass the keys boundary', () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            id: 'u1',
            email: 'a@test.local',
            name: null,
            role: Role.ADMIN,
            permissions: ['products'] as AdminPermission[],
          },
        }),
      }),
      getHandler: () => keys.listKeys,
      getClass: () => AdminProductKeysController,
    } as never;
    expect(guard.canActivate(context)).toBe(false);
  });
});
