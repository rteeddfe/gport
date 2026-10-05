import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../generated/prisma/client.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PaymentsService } from './payments.service.js';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto.js';

/** Acquiring configuration — part of the SUPER_ADMIN-only store settings. */
@ApiTags('payments')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN)
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('settings')
  findSettings() {
    return this.paymentsService.findSettings();
  }

  @Put('settings')
  updateSettings(@Body() dto: UpdatePaymentSettingsDto) {
    return this.paymentsService.updateSettings(dto);
  }

  /** Recent outbox letters (no SMTP yet — the rows are the delivery). */
  @Get('emails')
  findEmails(@Query('limit') limit?: string) {
    return this.paymentsService.findEmails(limit ? parseInt(limit, 10) : 20);
  }
}
