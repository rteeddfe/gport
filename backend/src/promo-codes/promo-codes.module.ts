import { Module } from '@nestjs/common';
import { AdminPromoCodesController } from './admin-promo-codes.controller.js';
import { PromoCodesController } from './promo-codes.controller.js';
import { PromoCodesService } from './promo-codes.service.js';

@Module({
  controllers: [AdminPromoCodesController, PromoCodesController],
  providers: [PromoCodesService],
  exports: [PromoCodesService],
})
export class PromoCodesModule {}
