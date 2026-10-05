import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RateLimit } from '../common/guards/rate-limit.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /** Direct checkout (no cart). Public: guests buy with just an email —
   * a passwordless holder account keeps their purchases; with a session
   * the order attaches to the signed-in user. */
  @Public()
  @Post()
  @RateLimit({ limit: 5, ttlMs: 60_000 })
  create(
    @CurrentUser() user: AuthUser | undefined,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(user?.id ?? null, dto);
  }

  /** The buyer's own orders (profile → Заказы). */
  @Get('my')
  findMy(@CurrentUser() user: AuthUser) {
    return this.ordersService.findMy(user.id);
  }
}
