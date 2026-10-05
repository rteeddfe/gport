import { Body, Controller, HttpCode, HttpStatus, Ip, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RateLimit } from '../common/guards/rate-limit.guard.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { SupportService, type TicketView } from './support.service.js';

@ApiTags('support')
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  /** Public support form from the storefront bubble. */
  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ limit: 3, ttlMs: 60_000 })
  create(
    @Body() dto: CreateTicketDto,
    @Ip() ip: string,
  ): Promise<TicketView> {
    return this.supportService.create(dto, ip);
  }
}
