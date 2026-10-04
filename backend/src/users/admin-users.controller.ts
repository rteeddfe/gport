import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { Role } from '../generated/prisma/client.js';
import { UpdateUserAccessDto } from './dto/update-user-access.dto.js';
import { UsersQueryDto } from './dto/users-query.dto.js';
import {
  AdminUserDetailView,
  AdminUserView,
  PaginatedUsers,
  UsersService,
} from './users.service.js';

/** SUPER_ADMIN user management: full account list, role and permission
 * editing, session revocation, deletion. Regular ADMINs are restricted to
 * their granted tabs and never see this section. */
@ApiTags('admin/users')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findMany(@Query() query: UsersQueryDto): Promise<PaginatedUsers> {
    return this.usersService.findMany(query.page, query.limit);
  }

  @Get(':id')
  findDetail(@Param('id', ParseUUIDPipe) id: string): Promise<AdminUserDetailView> {
    return this.usersService.findDetail(id);
  }

  @Patch(':id')
  updateAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserAccessDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<AdminUserView> {
    return this.usersService.updateAccess(id, dto, actor.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
  ): Promise<void> {
    await this.usersService.remove(id, actor.id);
  }

  /** Signs the user out everywhere: every active refresh token is revoked. */
  @Delete(':id/sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeAllSessions(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.usersService.revokeAllSessions(id);
  }

  @Delete(':id/sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<void> {
    await this.usersService.revokeSession(id, sessionId);
  }
}
