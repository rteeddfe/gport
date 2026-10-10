import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AdminPaymentsController } from './admin-payments.controller.js';
import { MailService } from './mail.service.js';
import { PaymentProviderRegistry } from './payment-provider-registry.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { TestPaymentProvider } from './providers/test-payment.provider.js';

@Module({
  imports: [AuditModule],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentsService, MailService, TestPaymentProvider, PaymentProviderRegistry],
  exports: [PaymentsService, MailService],
})
export class PaymentsModule {}
