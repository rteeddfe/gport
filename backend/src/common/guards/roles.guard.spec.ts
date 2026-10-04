import { Reflector } from '@nestjs/core';
import { Role } from '../../generated/prisma/client.js';
import type { AuthUser } from '../types/auth-user.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import type { AdminPermission } from '../constants/admin-permissions.js';
import { RolesGuard } from './roles.guard.js';

function makeContext(user: AuthUser | undefined) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => 'handler',
    getClass: () => 'class',
  } as never;
}

function makeGuard(
  requiredRoles: Role[] | undefined,
  requiredPermissions?: AdminPermission[],
): {
  guard: RolesGuard;
  reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
} {
  // Key-aware mock: the guard asks for roles and permissions separately,
  // and may be invoked more than once per test.
  const reflector = {
    getAllAndOverride: vi.fn(
      (key: symbol) =>
        (key === ROLES_KEY ? requiredRoles : requiredPermissions) as never,
    ),
  };
  const guard = new RolesGuard(reflector as unknown as Reflector);
  return { guard, reflector };
}

function makeUser(
  role: Role,
  permissions: AdminPermission[] = [],
): AuthUser {
  return {
    id: 'u1',
    email: 'u@test.local',
    name: null,
    role,
    permissions,
  };
}

describe('RolesGuard', () => {
  it('allows any request when no metadata is present', () => {
    const { guard } = makeGuard(undefined);
    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });

  it('rejects an unauthenticated request to a role-protected route', () => {
    const { guard } = makeGuard([Role.ADMIN]);
    expect(guard.canActivate(makeContext(undefined))).toBe(false);
  });

  it('rejects USER on an ADMIN route', () => {
    const { guard } = makeGuard([Role.ADMIN]);
    expect(guard.canActivate(makeContext(makeUser(Role.USER)))).toBe(false);
  });

  it('allows ADMIN on an ADMIN route', () => {
    const { guard } = makeGuard([Role.ADMIN]);
    expect(guard.canActivate(makeContext(makeUser(Role.ADMIN)))).toBe(true);
  });

  it('allows SUPER_ADMIN to bypass an ADMIN-only route', () => {
    const { guard } = makeGuard([Role.ADMIN]);
    expect(guard.canActivate(makeContext(makeUser(Role.SUPER_ADMIN)))).toBe(
      true,
    );
  });

  it('passes the required roles through the reflector', () => {
    const { guard, reflector } = makeGuard([Role.ADMIN]);
    guard.canActivate(makeContext(makeUser(Role.USER)));
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      'handler',
      'class',
    ]);
  });

  it('passes the required permissions through the reflector', () => {
    const { guard, reflector } = makeGuard(undefined, ['products']);
    guard.canActivate(makeContext(makeUser(Role.ADMIN)));
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSIONS_KEY, [
      'handler',
      'class',
    ]);
  });

  it('rejects an unauthenticated request to a permission-protected route', () => {
    const { guard } = makeGuard(undefined, ['products']);
    expect(guard.canActivate(makeContext(undefined))).toBe(false);
  });

  it('allows an ADMIN holding the required permission', () => {
    const { guard } = makeGuard(undefined, ['products']);
    expect(
      guard.canActivate(makeContext(makeUser(Role.ADMIN, ['products']))),
    ).toBe(true);
  });

  it('rejects an ADMIN without the required permission', () => {
    const { guard } = makeGuard(undefined, ['products']);
    expect(
      guard.canActivate(makeContext(makeUser(Role.ADMIN, ['posts']))),
    ).toBe(false);
  });

  it('requires every listed permission', () => {
    const { guard } = makeGuard(undefined, ['products', 'posts']);
    expect(
      guard.canActivate(makeContext(makeUser(Role.ADMIN, ['products']))),
    ).toBe(false);
    expect(
      guard.canActivate(
        makeContext(makeUser(Role.ADMIN, ['products', 'posts'])),
      ),
    ).toBe(true);
  });

  it('rejects USER even when a permission list would match', () => {
    const { guard } = makeGuard(undefined, ['products']);
    expect(
      guard.canActivate(makeContext(makeUser(Role.USER, ['products']))),
    ).toBe(false);
  });

  it('lets SUPER_ADMIN bypass the permission check', () => {
    const { guard } = makeGuard(undefined, ['products']);
    expect(
      guard.canActivate(makeContext(makeUser(Role.SUPER_ADMIN, []))),
    ).toBe(true);
  });

  it('checks roles and permissions together', () => {
    const { guard } = makeGuard([Role.ADMIN], ['products']);
    expect(
      guard.canActivate(makeContext(makeUser(Role.ADMIN, ['products']))),
    ).toBe(true);
    expect(
      guard.canActivate(makeContext(makeUser(Role.ADMIN, ['posts']))),
    ).toBe(false);
  });
});
