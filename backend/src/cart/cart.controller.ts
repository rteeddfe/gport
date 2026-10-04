import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard.js';
import type { AuthUser } from '../common/types/auth-user.js';
import {
  parseCookie,
  serializeSessionCookie,
  type CookieSameSite,
} from '../common/utils/cookies.js';
import { CartService, type CartIdentity, type CartMutationResult } from './cart.service.js';
import type { CartView } from './cart.view.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { ApplyPromoDto } from './dto/apply-promo.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';

export const CART_COOKIE = 'cart_token';
/** 30 days — enough to survive a visit gap, short enough to expire. */
const CART_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30;

@ApiTags('cart')
@Controller('cart')
@Public()
@UseGuards(OptionalJwtAuthGuard)
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  getCart(
    @Req() request: Request,
    @CurrentUser() user?: AuthUser,
  ): Promise<CartView> {
    return this.cartService.getCart(this.identity(request, user));
  }

  @Post('items')
  addItem(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: AddCartItemDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<CartView> {
    return this.mutate(request, response, user, (identity) =>
      this.cartService.addItem(identity, dto),
    );
  }

  @Patch('items/:itemId')
  updateItem(
    @Req() request: Request,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<CartView> {
    return this.cartService.updateItem(
      this.identity(request, user),
      itemId,
      dto,
    );
  }

  @Delete('items/:itemId')
  removeItem(
    @Req() request: Request,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user?: AuthUser,
  ): Promise<CartView> {
    return this.cartService.removeItem(this.identity(request, user), itemId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  clear(
    @Req() request: Request,
    @CurrentUser() user?: AuthUser,
  ): Promise<CartView> {
    return this.cartService.clear(this.identity(request, user));
  }

  @Post('promo')
  applyPromo(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: ApplyPromoDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<CartView> {
    return this.mutate(request, response, user, (identity) =>
      this.cartService.applyPromo(identity, dto),
    );
  }

  @Delete('promo')
  removePromo(
    @Req() request: Request,
    @CurrentUser() user?: AuthUser,
  ): Promise<CartView> {
    return this.cartService.removePromo(this.identity(request, user));
  }

  private identity(request: Request, user?: AuthUser): CartIdentity {
    return {
      userId: user?.id,
      guestToken: parseCookie(request.headers.cookie, CART_COOKIE),
    };
  }

  /** Wraps mutations that may create a guest cart and thus need a cookie. */
  private async mutate(
    request: Request,
    response: Response,
    user: AuthUser | undefined,
    action: (identity: CartIdentity) => Promise<CartMutationResult>,
  ): Promise<CartView> {
    const { view, guestToken } = await action(this.identity(request, user));
    if (guestToken) {
      // Same cookie policy as the session cookies (COOKIE_SAME_SITE) so a
      // cross-site deployment keeps the guest cart working too.
      const sameSite =
        this.configService.get<CookieSameSite>('cookieSameSite') ?? 'Lax';
      response.setHeader(
        'Set-Cookie',
        serializeSessionCookie(
          CART_COOKIE,
          guestToken,
          CART_COOKIE_TTL_SECONDS,
          { sameSite },
        ),
      );
    }
    return view;
  }
}
