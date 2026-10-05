import { CanActivate, ExecutionContext, HttpException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export interface RateLimitOptions {
  /** Allowed requests per IP inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  ttlMs: number;
}

const RATE_LIMIT_KEY = 'rateLimit';

/** Tightens the global dam on a sensitive route (auth, orders, …). */
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

/** Fallback dam for every route without its own @RateLimit. */
const DEFAULT_LIMIT: RateLimitOptions = { limit: 100, ttlMs: 60_000 };

const MAX_TRACKED_KEYS = 8_000;

/**
 * Per-instance in-memory sliding-window rate limiter (per IP + route).
 * The @nestjs/throttler default store had the same per-instance scope on
 * serverless, so behaviour is unchanged — but this guard is ESM-safe where
 * throttler 6.x require()s the ESM-only @nestjs/common and crashes the
 * Vercel function at boot.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ ip?: string }>();
    const options =
      this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? DEFAULT_LIMIT;

    const key = `${request.ip ?? 'unknown'}:${context.getClass().name}.${context.getHandler().name}`;
    const now = Date.now();
    const windowStart = now - options.ttlMs;

    const timestamps = (this.hits.get(key) ?? []).filter((t) => t > windowStart);
    if (timestamps.length >= options.limit) {
      throw new HttpException(
        { statusCode: 429, message: 'Слишком много запросов. Попробуйте позже.' },
        429,
      );
    }
    timestamps.push(now);
    this.hits.set(key, timestamps);

    if (this.hits.size > MAX_TRACKED_KEYS) {
      for (const [k, ts] of this.hits) {
        if (ts[ts.length - 1] <= windowStart) {
          this.hits.delete(k);
        }
      }
    }
    return true;
  }
}
