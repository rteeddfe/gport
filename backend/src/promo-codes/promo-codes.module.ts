import { Module } from '@nestjs/common';
import { AdminPromoCodesController } from './admin-promo-codes.controller.js';
import { PromoCodesService } from './promo-codes.service.js';

@Module({
  controllers: [AdminPromoCodesController],
  providers: [PromoCodesService],
  exports: [PromoCodesService],
})
export class PromoCodesModule {}
