import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../generated/prisma/client.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AdminUpdateTicketDto } from './dto/support-ticket.dto.js';
import { FindTicketsDto } from './dto/find-tickets.dto.js';
import { SupportService } from './support.service.js';

/** Support inbox for the admin «Обращения» tab: status pipeline + spam
 * cleanup. Key values are not involved, so plain ADMINs with the
 * «support» permission work here. */
@ApiTags('support')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@RequirePermissions('support')
@Controller('admin/support')
export class AdminSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  findMany(@Query() query: FindTicketsDto) {
    return this.supportService.findManyAdmin(query);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AdminUpdateTicketDto) {
    return this.supportService.update(id, dto.status);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.supportService.remove(id);
  }
}
