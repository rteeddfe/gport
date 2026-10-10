import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimit } from '../../common/guards/rate-limit.guard.js';
import { AuthService } from '../auth.service.js';
import { sessionCookieOptions, setSessionCookies } from '../session-cookies.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { OAuthStateService } from './oauth-state.service.js';
import { YandexOAuthService } from './yandex-oauth.service.js';
import { VkOAuthService } from './vk-oauth.service.js';
import { VerifyOAuthLinkDto } from './dto/verify-oauth-link.dto.js';

/** Fixed storefront destinations — server-controlled, never built from
 * request input (no open redirect). */
const SIGN_IN_PATH = '/sign-in';
const DASHBOARD_PATH = '/dashboard';

@ApiTags('auth')
@Controller('auth')
export class OAuthController {
  constructor(
    private readonly oauthState: OAuthStateService,
    private readonly yandex: YandexOAuthService,
    private readonly vk: VkOAuthService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /** Opens the Yandex authorize page: issues the browser-bound
   * state + PKCE pair and redirects. Server-side configuration only. */
  @Public()
  @Get('oauth/yandex/start')
  @RateLimit({ limit: 10, ttlMs: 60_000 })
  async yandexStart(@Res() response: Response): Promise<void> {
    if (!(await this.yandex.isEnabled())) {
      this.toSignIn(response, 'disabled');
      return;
    }
    const { state, codeChallenge, setCookies } = this.oauthState.issue(
      'YANDEX',
      sessionCookieOptions(this.configService, process.env.NODE_ENV),
    );
    response.setHeader('Set-Cookie', setCookies);
    response.redirect(
      302,
      await this.yandex.authorizeUrl({ state, codeChallenge }),
    );
  }

  /** The provider lands here with the authorization code (or an error).
   * Both oauth cookies die on EVERY outcome before anything else runs. */
  @Public()
  @Get('oauth/yandex/callback')
  @RateLimit({ limit: 10, ttlMs: 60_000 })
  async yandexCallback(
    @Req() request: Request,
    @Res() response: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
  ): Promise<void> {
    response.setHeader(
      'Set-Cookie',
      this.oauthState.clearCookies('YANDEX', sessionCookieOptions(this.configService, process.env.NODE_ENV)),
    );
    try {
      if (error || typeof code !== 'string' || code === '') {
        this.toSignIn(response, 'failed');
        return;
      }
      const verifier = this.oauthState.consume('YANDEX', request, state);
      const accessToken = await this.yandex.exchangeCode(code, verifier);
      const identity = await this.yandex.fetchIdentity(accessToken);
      const outcome = await this.authService.oauthLogin(
        'YANDEX',
        identity.providerUserId,
        identity.email,
      );
      if ('user' in outcome) {
        setSessionCookies(response, outcome, sessionCookieOptions(this.configService, process.env.NODE_ENV));
        response.redirect(302, `${this.storefrontOrigin()}${DASHBOARD_PATH}`);
        return;
      }
      // Existing GPort user with this email: linking needs the mailbox
      // code (M-OAUTH-4) — no identity, no session.
      this.toLink(response, outcome);
    } catch (cause) {
      this.toSignIn(
        response,
        cause instanceof BadRequestException ? 'email' : 'failed',
      );
    }
  }

  /** Opens the VK ID authorize page — the same state/PKCE machinery as
   * Yandex, with VK-bound cookies. */
  @Public()
  @Get('oauth/vk/start')
  @RateLimit({ limit: 10, ttlMs: 60_000 })
  async vkStart(@Res() response: Response): Promise<void> {
    if (!(await this.vk.isEnabled())) {
      this.toSignIn(response, 'disabled');
      return;
    }
    const { state, codeChallenge, setCookies } = this.oauthState.issue(
      'VK',
      sessionCookieOptions(this.configService, process.env.NODE_ENV),
    );
    response.setHeader('Set-Cookie', setCookies);
    response.redirect(302, await this.vk.authorizeUrl({ state, codeChallenge }));
  }

  /** VK delivers the code inside its `payload` parameter (JSON:
   * code/state/type/device_id per the official docs) — parsed by the
   * adapter. The VK cookies die first on EVERY outcome, as in Yandex. */
  @Public()
  @Get('oauth/vk/callback')
  @RateLimit({ limit: 10, ttlMs: 60_000 })
  async vkCallback(
    @Req() request: Request,
    @Res() response: Response,
    @Query('payload') payload?: string,
  ): Promise<void> {
    response.setHeader(
      'Set-Cookie',
      this.oauthState.clearCookies(
        'VK',
        sessionCookieOptions(this.configService, process.env.NODE_ENV),
      ),
    );
    try {
      const { code, state, deviceId } = this.vk.parseCallback(payload);
      const verifier = this.oauthState.consume('VK', request, state);
      const accessToken = await this.vk.exchangeCode(
        code,
        verifier,
        deviceId,
        state,
      );
      const identity = await this.vk.fetchIdentity(accessToken);
      const outcome = await this.authService.oauthLogin(
        'VK',
        identity.providerUserId,
        identity.email,
      );
      if ('user' in outcome) {
        setSessionCookies(
          response,
          outcome,
          sessionCookieOptions(this.configService, process.env.NODE_ENV),
        );
        response.redirect(302, `${this.storefrontOrigin()}${DASHBOARD_PATH}`);
        return;
      }
      // Existing GPort user with this email: the mailbox code is
      // M-OAUTH-4 — no identity, no session.
      this.toLink(response, outcome);
    } catch (cause) {
      this.toSignIn(
        response,
        cause instanceof BadRequestException ? 'email' : 'failed',
      );
    }
  }

  /** Existing GPort user path: the opaque challenge id rides to the
   * storefront so its code form can post to /oauth/link/verify. */
  private toLink(
    response: Response,
    outcome: { linkChallengeId?: string },
  ): void {
    const challenge =
      outcome.linkChallengeId ? `&challenge=${outcome.linkChallengeId}` : '';
    response.redirect(
      302,
      `${this.storefrontOrigin()}${SIGN_IN_PATH}?oauth=link${challenge}`,
    );
  }

  /** Server-controlled failure destination with a fixed, non-sensitive
   * code the storefront sign-in page can translate into a message. */
  private toSignIn(response: Response, code: string): void {
    response.redirect(302, `${this.storefrontOrigin()}${SIGN_IN_PATH}?oauth=${code}`);
  }

  /** Same fallback order as the payments redirect base. */
  private storefrontOrigin(): string {
    const configured = this.configService.get<string>('storefrontOrigin');
    if (configured) {
      return configured;
    }
    const origins = this.configService.get<string[]>('corsOrigins') ?? [];
    return origins[0] ?? 'http://localhost:3000';
  }

  /** Completes the linking after the mailed code: the identity is created
   * from the CHALLENGE bindings and a normal GPort session is issued —
   * same contract as /auth/register/verify. */
  @Public()
  @Post('oauth/link/verify')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 5, ttlMs: 60_000 })
  async verifyLink(
    @Body() dto: VerifyOAuthLinkDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AuthUser }> {
    const result = await this.authService.verifyLink(dto.challengeId, dto.code);
    setSessionCookies(
      response,
      result,
      sessionCookieOptions(this.configService, process.env.NODE_ENV),
    );
    return { user: result.user };
  }
}
