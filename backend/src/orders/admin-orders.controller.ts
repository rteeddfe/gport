import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../generated/prisma/client.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { OrdersService } from './orders.service.js';
import { FindOrdersDto } from './dto/find-orders.dto.js';

/** Buyer orders for the admin panel — support context, gated by the
 * «orders» permission; writes don't exist: statuses move via payment
 * webhooks. Delivered key values are SUPER_ADMIN-only. */
@ApiTags('orders')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@RequirePermissions('orders')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findMany(
    @CurrentUser() user: AuthUser,
    @Query() query: FindOrdersDto,
  ) {
    return this.ordersService.findManyAdmin(query, {
      includeKeys: user.role === Role.SUPER_ADMIN,
    });
  }

  @Get(':id')
  findDetail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.findDetailAdmin(id, {
      includeKeys: user.role === Role.SUPER_ADMIN,
    });
  }
}
