import { Module } from '@nestjs/common';
import { AdminAuditController } from './admin-audit.controller.js';
import { AuditService } from './audit.service.js';

/** Server-side audit log (M-AUDIT-1): append-only records of critical
 * admin/security mutations. AuditService is exported to feature modules
 * that own mutation points; the SUPER_ADMIN read endpoint lives here. */
@Module({
  controllers: [AdminAuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
