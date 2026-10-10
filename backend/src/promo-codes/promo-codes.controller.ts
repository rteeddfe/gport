import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator.js';
import { RateLimit } from '../common/guards/rate-limit.guard.js';
import { PromoCodesService } from './promo-codes.service.js';
import { PreviewPromoCodeDto } from './dto/preview-promo-code.dto.js';

@ApiTags('promo-codes')
@Controller('promo-codes')
export class PromoCodesController {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  /** Does the code work against this subtotal? The storefront form calls
   * it on «Применить»; codes are never listed publicly — this only
   * answers the code the buyer typed. Invalid codes throw 400 with the
   * buyer-facing message. */
  @Public()
  // Enumeration dam (M-1): the 200/400 oracle answers one code per
  // request, so the budget must stay far below the auth routes' — a
  // buyer legitimately tries a handful of codes, an attacker gets 5.
  @RateLimit({ limit: 5, ttlMs: 60_000 })
  @Get('preview')
  preview(@Query() query: PreviewPromoCodeDto) {
    return this.promoCodesService
      .resolveForCheckout(query.code, query.subtotalCents)
      .then(({ discountCents, totalCents }) => ({ discountCents, totalCents }));
  }
}
