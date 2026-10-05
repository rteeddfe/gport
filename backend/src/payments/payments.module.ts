import { Module } from '@nestjs/common';
import { AdminPaymentsController } from './admin-payments.controller.js';
import { MailService } from './mail.service.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentsService, MailService],
  exports: [PaymentsService, MailService],
})
export class PaymentsModule {}
