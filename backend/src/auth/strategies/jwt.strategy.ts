import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { ACCESS_TOKEN_COOKIE } from '../../common/constants/auth-cookies.js';
import { parseCookie } from '../../common/utils/cookies.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import type { Role } from '../../generated/prisma/client.js';
import { UsersService } from '../../users/users.service.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

/** Browsers authenticate via the httpOnly cookie; the Authorization header
 * stays supported for API tooling. */
function extractJwt(request: Request): string | null {
  return (
    parseCookie(request?.headers?.cookie, ACCESS_TOKEN_COOKIE) ??
    ExtractJwt.fromAuthHeaderAsBearerToken()(request)
  );
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: extractJwt,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwtSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    // Reload from DB so revoked/deleted users lose access immediately, and
    // so permission grants/revocations apply without a re-login.
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      permissions: user.permissions as AuthUser['permissions'],
    };
  }
}
