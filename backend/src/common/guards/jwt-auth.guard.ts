import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { type Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * Registered globally. Routes marked with @Public() never require a token,
 * but a valid one (cookie or Bearer) is still resolved into request.user —
 * @CurrentUser() must see the signed-in buyer on public checkout routes,
 * otherwise an order created by an authenticated user would silently fall
 * into the guest path. A missing/expired/invalid token simply leaves the
 * request anonymous instead of rejecting it.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isPublic) {
      return super.canActivate(context);
    }
    // Best-effort authentication on public routes: the passport strategy
    // rejects when no valid token is presented — that outcome is fine for
    // a public route, so the rejection is swallowed after the strategy has
    // had its chance to attach req.user.
    return new Promise<boolean>((resolve) => {
      const result = super.canActivate(context);
      if (result === true) {
        resolve(true);
        return;
      }
      Promise.resolve(result)
        .then(() => resolve(true))
        .catch(() => resolve(true));
    });
  }
}
