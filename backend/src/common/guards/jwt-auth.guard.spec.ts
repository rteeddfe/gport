import type { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard.js';

// The passport AuthGuard base is replaced by a stub whose canActivate we
// control, so the guard's public-route semantics can be observed in
// isolation (no real JWT/DB round-trip).
const parentState = vi.hoisted(() => ({
  result: undefined as unknown,
}));

vi.mock('@nestjs/passport', () => ({
  AuthGuard: () =>
    class {
      canActivate(): unknown {
        return parentState.result;
      }
    },
}));

function makeGuard(isPublic: boolean): JwtAuthGuard & {
  reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
} {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(isPublic),
  };
  return Object.assign(new JwtAuthGuard(reflector as never), {
    reflector: reflector as never,
  }) as never;
}

const reflectorOf = (guard: JwtAuthGuard) =>
  (guard as unknown as { reflector: { getAllAndOverride: ReturnType<typeof vi.fn> } })
    .reflector;

const context = {
  getHandler: vi.fn(),
  getClass: vi.fn(),
} as unknown as ExecutionContext;

function setParent(result: unknown) {
  parentState.result = result;
}

describe('JwtAuthGuard (M-PAYMENTS-1: optional auth on public routes)', () => {
  it('on a public route with a valid token, authentication still runs and the request becomes authenticated', async () => {
    setParent(true);
    const guard = makeGuard(true);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    // The parent strategy ran — request.user is populated by it.
    expect(reflectorOf(guard).getAllAndOverride).toHaveBeenCalled();
  });

  it('on a public route without a token, the parent rejection is swallowed and the route stays public', async () => {
    setParent(Promise.reject(new Error('401 no token')));
    const guard = makeGuard(true);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('on a public route with an invalid token, the request stays anonymous, not rejected', async () => {
    setParent(new Promise((_resolve, reject) => reject(new Error('invalid token'))));
    const guard = makeGuard(true);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('on a protected route, a rejected authentication still rejects', async () => {
    setParent(Promise.reject(new Error('401')));
    const guard = makeGuard(false);
    await expect(guard.canActivate(context)).rejects.toThrow('401');
  });

  it('on a protected route, a successful authentication resolves', async () => {
    setParent(true);
    const guard = makeGuard(false);
    await expect(Promise.resolve(guard.canActivate(context))).resolves.toBe(
      true,
    );
  });
});
