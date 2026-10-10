import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { vi } from 'vitest';
import { AuthService } from './auth.service.js';
import type { User } from '../generated/prisma/client.js';

const PASSWORD = 'Str0ngPass!23';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function makePrismaMock() {
  return {
    $transaction: vi.fn(),
    registerChallenge: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockImplementation(async ({ data }) => ({
        id: 'challenge-1',
        ...data,
      })),
      findFirst: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    refreshToken: {
      create: vi.fn().mockResolvedValue({}),
    },
    oAuthIdentity: {
      findUnique: vi.fn(),
      create: vi.fn().mockImplementation(async ({ data }) => ({
        id: 'identity-1',
        ...data,
      })),
    },
    oAuthLinkChallenge: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockImplementation(async ({ data }) => ({
        id: 'link-challenge-1',
        ...data,
      })),
      findUnique: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    user: {
      create: vi.fn().mockImplementation(async ({ data }) => ({
        id: '00000000-0000-0000-0000-0000000000bb',
        ...data,
      })),
      update: vi.fn(),
    },
  };
}

type PrismaMock = ReturnType<typeof makePrismaMock>;

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '00000000-0000-0000-0000-0000000000aa',
    email: 'victim@example.com',
    passwordHash: null,
    name: null,
    avatarUrl: null,
    role: 'USER',
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

/** A claim challenge row as the DB holds it: only hashes, never the
 * plaintext code — `code` exists only for the test caller. */
function makeChallenge(overrides: Record<string, unknown> = {}) {
  return {
    id: 'challenge-1',
    userId: '00000000-0000-0000-0000-0000000000aa',
    email: 'victim@example.com',
    code: '123456',
    codeHash: sha256('123456'),
    passwordHash: 'stored-bcrypt-of-chosen-password',
    name: null,
    expiresAt: new Date(Date.now() + 15 * 60_000),
    consumedAt: null,
    attempts: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeService(
  mock: PrismaMock,
  existing: User | null = makeUser(),
  challenge: Record<string, unknown> | null = null,
) {
  const usersService = {
    findByEmail: vi.fn().mockResolvedValue(existing),
    create: vi.fn().mockResolvedValue(makeUser({ passwordHash: 'hashed' })),
  };
  const jwtService = { signAsync: vi.fn().mockResolvedValue('access-token') };
  const mail = { queue: vi.fn().mockResolvedValue(undefined) };
  const service = new AuthService(
    usersService as never,
    jwtService as never,
    mock as never,
    mail as never,
  );
  // Interactive transactions run against the same mock in tests.
  mock.$transaction.mockImplementation(async (work: (tx: unknown) => unknown) =>
    work(mock as never),
  );
  if (challenge) {
    mock.registerChallenge.findFirst.mockResolvedValue(challenge);
  }
  return { mock, service, mail };
}

describe('AuthService.register — claim of a passwordless account (M-3)', () => {
  it('Test A: a passwordless account parks on a mailed code — no password, no session', async () => {
    const { mock, service, mail } = makeService(makePrismaMock());
    const before = Date.now();
    const result = await service.register({
      email: 'Victim@Example.com',
      password: PASSWORD,
      name: 'Attacker',
    });

    expect(result).toEqual({ verificationRequired: true });
    // The chosen password is NOT applied to the User row.
    expect(mock.user.update).not.toHaveBeenCalled();
    // No session of any kind is issued.
    expect(mock.refreshToken.create).not.toHaveBeenCalled();
    // The challenge stores hashes only and is valid for ~15 minutes.
    expect(mock.registerChallenge.create).toHaveBeenCalledTimes(1);
    const created = mock.registerChallenge.create.mock.calls[0][0].data;
    expect(created.email).toBe('victim@example.com');
    expect(created.passwordHash).not.toBe(PASSWORD);
    expect(created.expiresAt.getTime() - before).toBeGreaterThan(14 * 60_000);
    // The code rides to the mailbox owner, not in the response — and the
    // mailed code matches the stored hash.
    expect(mail.queue).toHaveBeenCalledTimes(1);
    expect(mail.queue.mock.calls[0][0].to).toBe('victim@example.com');
    const mailedCode =
      mail.queue.mock.calls[0][0].body.match(/\b(\d{6})\b/)?.[1] ?? '';
    expect(mailedCode).not.toBe('');
    expect(created.codeHash).toBe(sha256(mailedCode));
  });

  it('Test G: a REGISTERED account still rejects registration with 409', async () => {
    const { mock, service, mail } = makeService(
      makePrismaMock(),
      makeUser({ passwordHash: 'existing-hash' }),
    );
    await expect(
      service.register({ email: 'victim@example.com', password: PASSWORD }),
    ).rejects.toThrow(ConflictException);
    expect(mail.queue).not.toHaveBeenCalled();
    expect(mock.registerChallenge.create).not.toHaveBeenCalled();
  });

  it('Test H: a new email registers normally and issues a session', async () => {
    const { mock, service, mail } = makeService(makePrismaMock(), null);
    const result = await service.register({
      email: 'fresh@example.com',
      password: PASSWORD,
    });

    expect(result).toHaveProperty('accessToken', 'access-token');
    expect(mock.registerChallenge.create).not.toHaveBeenCalled();
    expect(mail.queue).not.toHaveBeenCalled();
  });
});

describe('AuthService.verifyRegister — claim challenges (M-3)', () => {
  it('Test C: the correct code claims the SAME user, sets the password and issues a session', async () => {
    const mock = makePrismaMock();
    const challenge = makeChallenge();
    const { service } = makeService(mock, makeUser(), challenge);
    const result = await service.verifyRegister({
      email: 'victim@example.com',
      code: challenge.code,
    });

    expect(result).toHaveProperty('accessToken', 'access-token');
    expect(mock.refreshToken.create).toHaveBeenCalledTimes(1);
    // The password lands on the SAME user id — attached orders follow.
    expect(mock.user.update).toHaveBeenCalledWith({
      where: { id: '00000000-0000-0000-0000-0000000000aa' },
      data: {
        passwordHash: 'stored-bcrypt-of-chosen-password',
        name: null,
      },
    });
    // The challenge is consumed by a single conditional statement.
    const consumeCalls = mock.registerChallenge.updateMany.mock.calls.filter(
      ([args]) => 'consumedAt' in args.data,
    );
    expect(consumeCalls).toHaveLength(1);
    expect(consumeCalls[0][0].where).toEqual({
      id: 'challenge-1',
      consumedAt: null,
    });
  });

  it('Test B: a wrong code rejects without touching the password or session', async () => {
    const mock = makePrismaMock();
    const challenge = makeChallenge({ code: '123456' });
    const { service } = makeService(mock, makeUser(), challenge);
    // The attempt gate passes; the hash comparison fails in the service.
    mock.registerChallenge.updateMany.mockImplementation(async (args: {
      data: Record<string, unknown>;
    }) => ('consumedAt' in args.data ? { count: 0 } : { count: 1 }));

    await expect(
      service.verifyRegister({ email: 'victim@example.com', code: '000000' }),
    ).rejects.toThrow(BadRequestException);
    expect(mock.user.update).not.toHaveBeenCalled();
    expect(mock.refreshToken.create).not.toHaveBeenCalled();
  });

  it('Test D: an expired (or attempt-exhausted) challenge rejects uniformly', async () => {
    const mock = makePrismaMock();
    const challenge = makeChallenge({ expiresAt: new Date(Date.now() - 1) });
    const { service } = makeService(mock, makeUser(), challenge);
    // The gate refuses any further attempt on a dead challenge.
    mock.registerChallenge.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.verifyRegister({
        email: 'victim@example.com',
        code: challenge.code,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(mock.user.update).not.toHaveBeenCalled();
  });

  it('Test E: a consumed code can never be replayed', async () => {
    const mock = makePrismaMock();
    const challenge = makeChallenge();
    const { service } = makeService(mock, makeUser(), challenge);
    // First verification succeeds…
    await service.verifyRegister({
      email: 'victim@example.com',
      code: challenge.code,
    });
    // …the row is consumed; a replay finds nothing usable.
    mock.registerChallenge.findFirst.mockResolvedValue(null);
    await expect(
      service.verifyRegister({
        email: 'victim@example.com',
        code: challenge.code,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(mock.user.update).toHaveBeenCalledTimes(1);
  });

  it('Test F: two concurrent verifications of one code — exactly one wins', async () => {
    const mock = makePrismaMock();
    const challenge = makeChallenge();
    const { service } = makeService(mock, makeUser(), challenge);
    // The single-statement consume lets only the first caller through;
    // the loser sees count 0 and the transaction rolls back.
    let consumed = false;
    mock.registerChallenge.updateMany.mockImplementation(async (args: {
      data: Record<string, unknown>;
    }) => {
      if ('consumedAt' in args.data) {
        if (consumed) {
          return { count: 0 };
        }
        consumed = true;
        return { count: 1 };
      }
      return { count: 1 };
    });

    const outcomes = await Promise.allSettled([
      service.verifyRegister({ email: 'victim@example.com', code: challenge.code }),
      service.verifyRegister({ email: 'victim@example.com', code: challenge.code }),
    ]);
    const winners = outcomes.filter((r) => r.status === 'fulfilled');
    const losers = outcomes.filter((r) => r.status === 'rejected');
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(losers[0].status).toBe('rejected');
    // Exactly one password write and one session issue.
    expect(mock.user.update).toHaveBeenCalledTimes(1);
    expect(mock.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('a verify for a registered or unknown email fails uniformly', async () => {
    const registered = makeService(
      makePrismaMock(),
      makeUser({ passwordHash: 'existing-hash' }),
    );
    await expect(
      registered.service.verifyRegister({
        email: 'victim@example.com',
        code: '123456',
      }),
    ).rejects.toThrow(BadRequestException);

    const unknown = makeService(makePrismaMock(), null);
    await expect(
      unknown.service.verifyRegister({
        email: 'ghost@example.com',
        code: '123456',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('AuthService.oauthLogin — Yandex resolution (M-OAUTH-2)', () => {
  function makeOAuthService(mock: ReturnType<typeof makePrismaMock>, existing: User | null) {
    const usersService = {
      findByEmail: vi.fn().mockResolvedValue(existing),
      create: vi.fn(),
      findById: vi
        .fn()
        .mockResolvedValue(existing ?? makeUser({ id: '00000000-0000-0000-0000-0000000000aa' })),
    };
    const jwtService = { signAsync: vi.fn().mockResolvedValue('access-token') };
    const mail = { queue: vi.fn() };
    const service = new AuthService(
      usersService as never,
      jwtService as never,
      mock as never,
      mail as never,
    );
    mock.$transaction.mockImplementation(async (work: (tx: unknown) => unknown) =>
      work(mock as never),
    );
    return { service, usersService, jwtService, mail };
  }

  function uniqueViolation(): Error {
    return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7.10.0',
    });
  }

  it('existing identity logs the user in without any email matching', async () => {
    const mock = makePrismaMock();
    mock.oAuthIdentity.findUnique.mockResolvedValue({
      id: 'identity-1',
      provider: 'YANDEX',
      providerUserId: 'ya-42',
      user: makeUser(),
    });
    const { service, usersService } = makeOAuthService(mock, null);

    const result = await service.oauthLogin('YANDEX', 'ya-42', 'changed@yandex.ru');

    expect(result).toHaveProperty('accessToken', 'access-token');
    // Canonical identity: the (possibly changed) provider email is ignored.
    expect(usersService.findByEmail).not.toHaveBeenCalled();
    expect(mock.oAuthIdentity.create).not.toHaveBeenCalled();
  });

  it('a provider without email fails controlled — no user, no identity, no session', async () => {
    const mock = makePrismaMock();
    const { service } = makeOAuthService(mock, null);

    await expect(service.oauthLogin('YANDEX', 'ya-42', null)).rejects.toThrow(
      BadRequestException,
    );
    expect(mock.user.create).not.toHaveBeenCalled();
    expect(mock.oAuthIdentity.create).not.toHaveBeenCalled();
    expect(mock.refreshToken.create).not.toHaveBeenCalled();
  });

  it('an existing GPort user (registered OR passwordless) is never auto-linked', async () => {
    const mock = makePrismaMock();
    const { service } = makeOAuthService(mock, makeUser({ passwordHash: 'hash' }));
    await expect(
      service.oauthLogin('YANDEX', 'ya-42', 'victim@example.com'),
    ).resolves.toMatchObject({ verificationRequired: true });
    expect(mock.oAuthIdentity.create).not.toHaveBeenCalled();
    expect(mock.refreshToken.create).not.toHaveBeenCalled();

    const passwordless = makePrismaMock();
    const { service: service2 } = makeOAuthService(
      passwordless,
      makeUser({ passwordHash: null }),
    );
    await expect(
      service2.oauthLogin('YANDEX', 'ya-42', 'victim@example.com'),
    ).resolves.toMatchObject({ verificationRequired: true });
    expect(passwordless.oAuthIdentity.create).not.toHaveBeenCalled();
    expect(passwordless.refreshToken.create).not.toHaveBeenCalled();
  });

  it('a brand-new buyer gets one User (passwordless) + one identity, atomically, with normalized email', async () => {
    const mock = makePrismaMock();
    const { service } = makeOAuthService(mock, null);

    const result = await service.oauthLogin('YANDEX', 'ya-42', '  Buyer@Example.COM ');

    expect(result).toHaveProperty('accessToken', 'access-token');
    expect(mock.user.create).toHaveBeenCalledWith({
      data: { email: 'buyer@example.com', passwordHash: null },
    });
    expect(mock.oAuthIdentity.create).toHaveBeenCalledWith({
      data: {
        userId: '00000000-0000-0000-0000-0000000000bb',
        provider: 'YANDEX',
        providerUserId: 'ya-42',
        emailAtLink: 'buyer@example.com',
      },
    });
    expect(mock.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('a concurrent callback that won the identity race logs the winner in', async () => {
    const mock = makePrismaMock();
    const { service } = makeOAuthService(mock, null);
    mock.oAuthIdentity.create.mockRejectedValue(uniqueViolation());
    mock.oAuthIdentity.findUnique
      .mockResolvedValueOnce(null) // initial lookup: no identity
      .mockResolvedValueOnce({
        id: 'identity-1',
        provider: 'YANDEX',
        providerUserId: 'ya-42',
        user: makeUser(),
      }); // re-read after P2002: the concurrent callback won

    const result = await service.oauthLogin('YANDEX', 'ya-42', 'buyer@example.com');

    expect(result).toHaveProperty('accessToken', 'access-token');
    // The tx (whose create lost the race) is rolled back by the DB — the
    // user row that exists is the concurrent winner's, not a second one.
    expect(mock.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('an email registration that wins the race is NOT auto-linked', async () => {
    const mock = makePrismaMock();
    const { service } = makeOAuthService(mock, null);
    mock.oAuthIdentity.create.mockRejectedValue(uniqueViolation());
    // Re-read finds no identity: the concurrent password registration
    // created the User. Attaching the identity to it is forbidden in v1.
    mock.oAuthIdentity.findUnique.mockResolvedValue(null);

    await expect(
      service.oauthLogin('YANDEX', 'ya-42', 'buyer@example.com'),
    ).resolves.toMatchObject({ verificationRequired: true });
    expect(mock.refreshToken.create).not.toHaveBeenCalled();
  });
});

describe('AuthService — OAuth linking via mailbox code (M-OAUTH-4)', () => {
  function makeLinkService(mock: ReturnType<typeof makePrismaMock>, user: User | null) {
    const usersService = {
      findByEmail: vi.fn().mockResolvedValue(user),
      findById: vi.fn().mockResolvedValue(user),
      create: vi.fn(),
    };
    const jwtService = { signAsync: vi.fn().mockResolvedValue('access-token') };
    const mail = { queue: vi.fn().mockResolvedValue(undefined) };
    const service = new AuthService(
      usersService as never,
      jwtService as never,
      mock as never,
      mail as never,
    );
    mock.$transaction.mockImplementation(async (work: (tx: unknown) => unknown) =>
      work(mock as never),
    );
    return { service, usersService, mail, jwtService };
  }

  function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  const CHALLENGE = {
    id: 'link-challenge-1',
    userId: '00000000-0000-0000-0000-0000000000aa',
    provider: 'VK',
    providerUserId: 'vk-77',
    email: 'buyer@example.com',
    code: '123456',
    expiresAt: new Date(Date.now() + 15 * 60_000),
    attempts: 0,
    consumedAt: null,
  };

  function makeChallenge(overrides: Record<string, unknown> = {}) {
    return {
      ...CHALLENGE,
      codeHash: sha256(CHALLENGE.code),
      ...overrides,
    };
  }

  const USER_ID_A = '00000000-0000-0000-0000-0000000000aa';

  it('oauthLogin case D creates a challenge bound to (user, provider, providerUserId, email)', async () => {
    const mock = makePrismaMock();
    const { service, mail } = makeLinkService(
      mock,
      makeUser({ id: USER_ID_A, passwordHash: null }),
    );
    const before = Date.now();

    const result = await service.oauthLogin('VK', 'vk-77', 'Buyer@Example.COM');

    expect(result).toMatchObject({ verificationRequired: true });
    expect(result).toHaveProperty('linkChallengeId', 'link-challenge-1');
    // Previous challenges of the same provider are replaced — the old
    // code dies with them.
    expect(mock.oAuthLinkChallenge.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID_A, provider: 'VK' },
    });
    const created = mock.oAuthLinkChallenge.create.mock.calls[0][0].data;
    expect(created.provider).toBe('VK');
    expect(created.providerUserId).toBe('vk-77');
    expect(created.userId).toBe(USER_ID_A);
    expect(created.email).toBe('buyer@example.com');
    expect(created.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(created.expiresAt.getTime() - before).toBeGreaterThan(14 * 60_000);
    // The code rides to the mailbox; no identity, no session yet.
    expect(mail.queue).toHaveBeenCalledTimes(1);
    expect(mail.queue.mock.calls[0][0].to).toBe('victim@example.com');
    expect(mock.oAuthIdentity.create).not.toHaveBeenCalled();
    expect(mock.refreshToken.create).not.toHaveBeenCalled();
  });

  it('the correct code creates the identity from the CHALLENGE bindings and issues a session', async () => {
    const mock = makePrismaMock();
    const challenge = { ...CHALLENGE, codeHash: sha256(CHALLENGE.code) };
    mock.oAuthLinkChallenge.findUnique.mockResolvedValue(challenge);
    const { service } = makeLinkService(mock, makeUser());
    mock.oAuthLinkChallenge.findUnique.mockResolvedValue(challenge);

    const result = await service.verifyLink('link-challenge-1', CHALLENGE.code);

    expect(result).toHaveProperty('accessToken', 'access-token');
    expect(mock.oAuthIdentity.create).toHaveBeenCalledWith({
      data: {
        userId: challenge.userId,
        provider: 'VK',
        providerUserId: 'vk-77',
        emailAtLink: 'buyer@example.com',
      },
    });
    // Single-statement consume.
    const consumeCalls = mock.oAuthLinkChallenge.updateMany.mock.calls.filter(
      ([args]) => 'consumedAt' in args.data,
    );
    expect(consumeCalls).toHaveLength(1);
    expect(consumeCalls[0][0].where).toEqual({
      id: 'link-challenge-1',
      consumedAt: null,
    });
  });

  it('a wrong code burns an attempt and creates no identity or session', async () => {
    const mock = makePrismaMock();
    const challenge = { ...CHALLENGE, codeHash: sha256('123456') };
    const { service } = makeLinkService(mock, makeUser());
    mock.oAuthLinkChallenge.findUnique.mockResolvedValue(challenge);
    mock.oAuthLinkChallenge.updateMany.mockImplementation(async (args: {
      data: Record<string, unknown>;
    }) => ('consumedAt' in args.data ? { count: 0 } : { count: 1 }));

    await expect(
      service.verifyLink('link-challenge-1', '000000'),
    ).rejects.toThrow(BadRequestException);
    expect(mock.oAuthIdentity.create).not.toHaveBeenCalled();
    expect(mock.refreshToken.create).not.toHaveBeenCalled();
  });

  it('expired and attempt-exhausted challenges fail uniformly', async () => {
    const mock = makePrismaMock();
    const challenge = makeChallenge({ expiresAt: new Date(Date.now() - 1) });
    const { service } = makeLinkService(mock, makeUser());
    mock.oAuthLinkChallenge.findUnique.mockResolvedValue(challenge);
    mock.oAuthLinkChallenge.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.verifyLink('link-challenge-1', challenge.code),
    ).rejects.toThrow(BadRequestException);

    // The gate is the only place attempts/TTL are enforced (atomic).
    const gate = mock.oAuthLinkChallenge.updateMany.mock.calls[0][0];
    expect(gate.where.consumedAt).toBeNull();
    expect(gate.where.expiresAt).toEqual({ gt: expect.any(Date) });
    expect(gate.where.attempts).toEqual({ lt: 5 });
  });

  it('a consumed challenge can never be replayed', async () => {
    const mock = makePrismaMock();
    const challenge = makeChallenge();
    const { service } = makeLinkService(mock, makeUser());
    mock.oAuthLinkChallenge.findUnique.mockResolvedValue(challenge);
    // First verify succeeds…
    await service.verifyLink('link-challenge-1', challenge.code);
    // …the row is consumed; a replay finds nothing usable.
    mock.oAuthLinkChallenge.findUnique.mockResolvedValue(null);
    await expect(
      service.verifyLink('link-challenge-1', challenge.code),
    ).rejects.toThrow(BadRequestException);
    expect(mock.oAuthIdentity.create).toHaveBeenCalledTimes(1);
  });

  it('an identity already bound to ANOTHER user is rejected without consuming', async () => {
    const mock = makePrismaMock();
    const challenge = makeChallenge();
    const { service } = makeLinkService(mock, makeUser());
    mock.oAuthLinkChallenge.findUnique.mockResolvedValue(challenge);
    mock.oAuthIdentity.findUnique.mockResolvedValue({
      id: 'identity-1',
      userId: 'someone-else',
      provider: 'VK',
      providerUserId: 'vk-77',
    });

    await expect(
      service.verifyLink('link-challenge-1', challenge.code),
    ).rejects.toThrow(BadRequestException);
    // The gate (attempt burn) must not even run for a collision.
    expect(mock.oAuthLinkChallenge.updateMany).not.toHaveBeenCalled();
    expect(mock.oAuthIdentity.create).not.toHaveBeenCalled();
  });

  it('an identity already bound to the SAME user completes idempotently', async () => {
    const mock = makePrismaMock();
    const challenge = makeChallenge();
    const { service } = makeLinkService(mock, makeUser());
    mock.oAuthLinkChallenge.findUnique.mockResolvedValue(challenge);
    mock.oAuthIdentity.findUnique.mockResolvedValue({
      id: 'identity-1',
      userId: challenge.userId,
      provider: 'VK',
      providerUserId: 'vk-77',
    });

    const result = await service.verifyLink('link-challenge-1', challenge.code);

    expect(result).toHaveProperty('accessToken', 'access-token');
    expect(mock.oAuthIdentity.create).not.toHaveBeenCalled();
    expect(mock.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('the identity is created with the challenge bindings — a VK challenge can never produce a Yandex identity', async () => {
    const mock = makePrismaMock();
    const challenge = makeChallenge({ provider: 'VK' });
    const { service } = makeLinkService(mock, makeUser());
    mock.oAuthLinkChallenge.findUnique.mockResolvedValue(challenge);

    await service.verifyLink('link-challenge-1', challenge.code);

    expect(mock.oAuthIdentity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: 'VK',
        providerUserId: 'vk-77',
        userId: challenge.userId,
      }),
    });
  });

  it('two concurrent verifications of one code — exactly one link and one session', async () => {
    const mock = makePrismaMock();
    const challenge = makeChallenge();
    const { service, jwtService } = makeLinkService(mock, makeUser());
    mock.oAuthLinkChallenge.findUnique.mockResolvedValue(challenge);
    let consumed = false;
    mock.oAuthLinkChallenge.updateMany.mockImplementation(async (args: {
      data: Record<string, unknown>;
    }) => {
      if ('consumedAt' in args.data) {
        if (consumed) {
          return { count: 0 };
        }
        consumed = true;
        return { count: 1 };
      }
      return { count: 1 };
    });

    const outcomes = await Promise.allSettled([
      service.verifyLink('link-challenge-1', challenge.code),
      service.verifyLink('link-challenge-1', challenge.code),
    ]);
    expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((r) => r.status === 'rejected')).toHaveLength(1);
    // One identity create, one session.
    expect(mock.oAuthIdentity.create).toHaveBeenCalledTimes(1);
    expect(jwtService.signAsync).toHaveBeenCalledTimes(1);
  });
});
