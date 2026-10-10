import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import { AuditService, type PaginatedAuditLogs } from './audit.service.js';
import { AuditLogsQueryDto } from './dto/audit-logs-query.dto.js';

/**
 * SUPER_ADMIN read-only view of the audit log (M-AUDIT-1). Append-only by
 * policy: this controller exposes ONLY the list endpoint — no create,
 * update or delete routes exist anywhere. ADMIN and USER have no access
 * (the global RolesGuard is the security boundary).
 */
@ApiTags('admin/audit-logs')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN)
@Controller('admin/audit-logs')
export class AdminAuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findMany(@Query() query: AuditLogsQueryDto): Promise<PaginatedAuditLogs> {
    return this.auditService.findMany(query);
  }
}
