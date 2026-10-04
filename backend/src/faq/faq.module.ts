import { Module } from '@nestjs/common';
import { AdminFaqController, FaqController } from './faq.controller.js';
import { FaqService } from './faq.service.js';

@Module({
  controllers: [FaqController, AdminFaqController],
  providers: [FaqService],
})
export class FaqModule {}
