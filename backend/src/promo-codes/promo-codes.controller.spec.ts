import { HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PromoCodesController } from './promo-codes.controller.js';
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';

/** A real guard over the real controller: the same getAllAndOverride path
 * the global guard runs, so the tests prove the actual wiring, including
 * that the @RateLimit metadata landed on the preview handler. */
function makeGuard() {
  return new RateLimitGuard(new Reflector());
}

function makeContext(ip: string) {
  const handler = (PromoCodesController.prototype as never as Record<
    string,
    () => unknown
  >).preview;
  return {
    switchToHttp: () => ({
      getRequest: () => ({ ip }),
    }),
    getHandler: () => handler,
    getClass: () => PromoCodesController,
  } as never;
}

/** A route without @RateLimit — exercises the DEFAULT_LIMIT fallback. */
class SomeOtherController {
  other() {}
}

describe('PromoCodesController.preview rate limit (M-1)', () => {
  it('allows requests 1-5 from one IP and rate-limits the 6th with 429', () => {
    const guard = makeGuard();
    for (let i = 0; i < 5; i++) {
      expect(guard.canActivate(makeContext('2.2.2.2'))).toBe(true);
    }
    expect(() => guard.canActivate(makeContext('2.2.2.2'))).toThrow(
      HttpException,
    );
    try {
      guard.canActivate(makeContext('2.2.2.2'));
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(429);
    }
  });

  it('a different IP gets its own budget', () => {
    const guard = makeGuard();
    for (let i = 0; i < 5; i++) {
      guard.canActivate(makeContext('3.3.3.3'));
    }
    expect(guard.canActivate(makeContext('3.3.3.4'))).toBe(true);
  });

  it('routes without @RateLimit keep the 100/min global default', () => {
    const guard = makeGuard();
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ ip: '5.5.5.5' }),
      }),
      getHandler: () =>
        (SomeOtherController.prototype as never as Record<string, () => unknown>)
          .other,
      getClass: () => SomeOtherController,
    } as never;
    for (let i = 0; i < 100; i++) {
      expect(guard.canActivate(ctx)).toBe(true);
    }
    expect(() => guard.canActivate(ctx)).toThrow(HttpException);
  });
});
