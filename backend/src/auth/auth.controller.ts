import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_SECONDS,
} from '../common/constants/auth-cookies.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';
import {
  parseCookie,
  serializeExpiredCookie,
  serializeSessionCookie,
  type CookieSameSite,
} from '../common/utils/cookies.js';
import { AuthService, type AuthResult } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';



/** Profile-only body: the tokens themselves travel as httpOnly cookies. */
interface SessionResponse {
  user: AuthUser;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    const result = await this.authService.register(dto);
    this.setSessionCookies(response, result);
    return { user: result.user };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    const result = await this.authService.login(dto);
    this.setSessionCookies(response, result);
    return { user: result.user };
  }

  /** Rotates the session pair and returns the fresh profile. */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    const result = await this.authService.refreshSession(
      parseCookie(request.headers.cookie, REFRESH_TOKEN_COOKIE),
    );
    this.setSessionCookies(response, result);
    return { user: result.user };
  }

  /** Revokes the presented refresh token and clears the cookie jar. */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.revokeSession(
      parseCookie(request.headers.cookie, REFRESH_TOKEN_COOKIE),
    );
    response.setHeader('Set-Cookie', [
      serializeExpiredCookie(ACCESS_TOKEN_COOKIE, this.cookieSameSite()),
      serializeExpiredCookie(REFRESH_TOKEN_COOKIE, this.cookieSameSite()),
    ]);
  }

  @Get('me')
  @ApiBearerAuth()
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }

  /** Self-service profile edit; returns the fresh profile. */
  @Patch('me')
  @ApiBearerAuth()
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<AuthUser> {
    return this.authService.updateProfile(user.id, dto);
  }

  /** Password change: other sessions are revoked, the current one stays. */
  @Post('password')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Req() request: Request,
  ): Promise<void> {
    await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
      parseCookie(request.headers.cookie, REFRESH_TOKEN_COOKIE),
    );
  }

  /** httpOnly SameSite cookies (from COOKIE_SAME_SITE, default Lax);
   * Secure added behind TLS (production) and always with SameSite=None. */
  private cookieSameSite(): CookieSameSite {
    return this.configService.get<CookieSameSite>('cookieSameSite') ?? 'Lax';
  }

  private setSessionCookies(response: Response, result: AuthResult): void {
    const secure =
      this.configService.get<string>('NODE_ENV') === 'production';
    const sameSite = this.cookieSameSite();
    response.setHeader('Set-Cookie', [
      serializeSessionCookie(
        ACCESS_TOKEN_COOKIE,
        result.accessToken,
        ACCESS_TOKEN_TTL_SECONDS,
        { secure, sameSite },
      ),
      serializeSessionCookie(
        REFRESH_TOKEN_COOKIE,
        result.refreshToken,
        REFRESH_TOKEN_TTL_SECONDS,
        { secure, sameSite },
      ),
    ]);
  }
}
