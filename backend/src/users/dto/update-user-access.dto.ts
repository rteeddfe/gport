import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional } from 'class-validator';
import { ADMIN_PERMISSIONS } from '../../common/constants/admin-permissions.js';
import type { AdminPermission } from '../../common/constants/admin-permissions.js';
import type { Role } from '../../generated/prisma/client.js';

/** SUPER_ADMIN can only grant the ADMIN role (never SUPER_ADMIN) and only
 * the permissions from ADMIN_PERMISSIONS. An empty permissions array is
 * valid: an ADMIN with no permissions sees the panel but no domain tabs. */
export class UpdateUserAccessDto {
  @ApiPropertyOptional({ enum: ['USER', 'ADMIN'] })
  @IsOptional()
  @IsIn(['USER', 'ADMIN'])
  role?: Role;

  @ApiPropertyOptional({ type: [String], enum: ADMIN_PERMISSIONS })
  @IsOptional()
  @IsArray()
  @IsIn([...ADMIN_PERMISSIONS], { each: true })
  permissions?: AdminPermission[];
}
