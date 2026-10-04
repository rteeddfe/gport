import { type ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard, but anonymous requests pass through with `req.user`
 * left undefined. Used by endpoints that exist in both a guest and an
 * authenticated variant (e.g. the cart).
 */
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      return true;
    }
    return true;
  }
}
