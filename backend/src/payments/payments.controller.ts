import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RateLimit } from '../common/guards/rate-limit.guard.js';
import { Public } from '../common/decorators/public.decorator.js';
import { PaymentsService } from './payments.service.js';
import { TestWebhookDto } from './dto/test-webhook.dto.js';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /** Enabled payment methods for the storefront buy dialog. */
  @Public()
  @Get('methods')
  listMethods() {
    return this.paymentsService.listEnabled();
  }

  /** Emulator page data — the capability token authorizes the read. */
  @Public()
  @Get('test/session/:token')
  findTestSession(@Param('token') token: string) {
    return this.paymentsService.findTestSession(token);
  }

  /** Server-to-server callback from the test acquiring emulator
   * (HMAC-signed, idempotent — the same contract a real acquirer has). */
  @Public()
  @Post('webhook/test')
  @RateLimit({ limit: 30, ttlMs: 60_000 })
  handleTestWebhook(@Body() dto: TestWebhookDto) {
    return this.paymentsService.handleTestWebhook(dto);
  }
}
