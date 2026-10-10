import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AdminUsersController } from './admin-users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [AuditModule],
  controllers: [AdminUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
