import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module.js';
import { PromoCodesModule } from '../promo-codes/promo-codes.module.js';
import { AdminOrdersController } from './admin-orders.controller.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [PaymentsModule, PromoCodesModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
