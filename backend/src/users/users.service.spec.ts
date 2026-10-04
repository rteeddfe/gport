import type { User } from '../generated/prisma/client.js';
import { UsersService } from './users.service.js';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_ID = '22222222-2222-2222-2222-222222222222';

function makePrismaMock() {
  return {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    refreshToken: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: USER_ID,
    email: 'user@test.local',
    passwordHash: 'hash',
    name: null,
    role: 'USER',
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeService() {
  const prisma = makePrismaMock();
  return { service: new UsersService(prisma as never), prisma };
}

describe('UsersService.findMany', () => {
  it('returns paginated users without password hashes', async () => {
    const { service, prisma } = makeService();
    prisma.user.findMany.mockResolvedValue([makeUser()]);
    prisma.user.count.mockResolvedValue(1);

    const result = await service.findMany(1, 20);

    expect(result.total).toBe(1);
    expect(result.pages).toBe(1);
    expect(result.items[0].email).toBe('user@test.local');
    expect('passwordHash' in result.items[0]).toBe(false);
  });
});

describe('UsersService.findDetail', () => {
  it('returns the user with active sessions', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue({
      ...makeUser({ role: 'ADMIN', permissions: ['posts'] }),
      refreshTokens: [
        { id: 's1', createdAt: new Date(), expiresAt: new Date() },
      ],
    });

    const detail = await service.findDetail(USER_ID);

    expect(detail.role).toBe('ADMIN');
    expect(detail.sessions).toHaveLength(1);
  });

  it('throws 404 for a missing user', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.findDetail(USER_ID)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('UsersService.updateAccess', () => {
  it('updates role and permissions', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(makeUser());
    prisma.user.update.mockResolvedValue(
      makeUser({ role: 'ADMIN', permissions: ['posts'] }),
    );

    const view = await service.updateAccess(
      USER_ID,
      { role: 'ADMIN', permissions: ['posts'] },
      OTHER_ID,
    );

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { role: 'ADMIN', permissions: ['posts'] },
    });
    expect(view.role).toBe('ADMIN');
    expect(view.permissions).toEqual(['posts']);
    expect('passwordHash' in view).toBe(false);
  });

  it('throws 404 for a missing user', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.updateAccess(USER_ID, { role: 'ADMIN' }, OTHER_ID),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('refuses to modify a SUPER_ADMIN', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(makeUser({ role: 'SUPER_ADMIN' }));

    await expect(
      service.updateAccess(USER_ID, { role: 'USER' }, OTHER_ID),
    ).rejects.toMatchObject({ status: 400 });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('refuses to change the own role', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(makeUser());

    await expect(
      service.updateAccess(USER_ID, { role: 'ADMIN' }, USER_ID),
    ).rejects.toMatchObject({ status: 400 });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('UsersService.remove', () => {
  it('deletes an existing USER', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(makeUser());

    await service.remove(USER_ID, OTHER_ID);

    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: USER_ID } });
  });

  it('throws 404 for a missing user', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.remove(USER_ID, OTHER_ID)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('refuses to delete the own account', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(makeUser());

    await expect(service.remove(USER_ID, USER_ID)).rejects.toMatchObject({
      status: 400,
    });
  });

  it('refuses to delete a SUPER_ADMIN', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(makeUser({ role: 'SUPER_ADMIN' }));

    await expect(service.remove(USER_ID, OTHER_ID)).rejects.toMatchObject({
      status: 400,
    });
  });
});

describe('UsersService.revokeAllSessions', () => {
  it('revokes every active refresh token of the user', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(makeUser());

    await service.revokeAllSessions(USER_ID);

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('throws 404 for a missing user', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.revokeAllSessions(USER_ID)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('UsersService.revokeSession', () => {
  it('revokes one session of the user', async () => {
    const { service, prisma } = makeService();
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.revokeSession(USER_ID, '00000000-0000-0000-0000-0000000000aa'),
    ).resolves.toBeUndefined();
  });

  it('throws 404 when nothing was revoked', async () => {
    const { service, prisma } = makeService();
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.revokeSession(USER_ID, '00000000-0000-0000-0000-0000000000aa'),
    ).rejects.toMatchObject({ status: 404 });
  });
});
