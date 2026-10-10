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
import { RateLimit } from '../common/guards/rate-limit.guard.js';
import type { Request, Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '../common/constants/auth-cookies.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';
import {
  parseCookie,
  serializeExpiredCookie,
} from '../common/utils/cookies.js';
import { AuthService, type AuthResult } from './auth.service.js';
import { sessionCookieOptions, setSessionCookies } from './session-cookies.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { VerifyRegisterDto } from './dto/register.dto.js';
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
  @RateLimit({ limit: 3, ttlMs: 60_000 })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse | { verificationRequired: true }> {
    const result = await this.authService.register(dto);
    // Claiming a passwordless (guest-checkout) account parks on a mailed
    // code first — no cookies, no password change until verification.
    if ('verificationRequired' in result) {
      return result;
    }
    this.applySessionCookies(response, result);
    return { user: result.user };
  }

  /** Completes a passwordless-account claim after the mailed code. On
   * success the account gets its password and a normal session. */
  @Public()
  @Post('register/verify')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 5, ttlMs: 60_000 })
  async verifyRegister(
    @Body() dto: VerifyRegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    const result = await this.authService.verifyRegister(dto);
    this.applySessionCookies(response, result);
    return { user: result.user };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 5, ttlMs: 60_000 })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    const result = await this.authService.login(dto);
    this.applySessionCookies(response, result);
    return { user: result.user };
  }

  /** Rotates the session pair and returns the fresh profile. */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 30, ttlMs: 60_000 })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    const result = await this.authService.refreshSession(
      parseCookie(request.headers.cookie, REFRESH_TOKEN_COOKIE),
    );
    this.applySessionCookies(response, result);
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
    const sameSite = sessionCookieOptions(
      this.configService,
      this.configService.get<string>('NODE_ENV'),
    ).sameSite;
    response.setHeader('Set-Cookie', [
      serializeExpiredCookie(ACCESS_TOKEN_COOKIE, sameSite),
      serializeExpiredCookie(REFRESH_TOKEN_COOKIE, sameSite),
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

  /** Same flags as the OAuth callback — one shared implementation. */
  private applySessionCookies(response: Response, result: AuthResult): void {
    setSessionCookies(
      response,
      result,
      sessionCookieOptions(this.configService, this.configService.get<string>('NODE_ENV')),
    );
  }
}

