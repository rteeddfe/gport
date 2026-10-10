import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import { auditActorFromAuthUser, auditRequestContext } from '../audit/audit.types.js';
import type { AuthUser } from '../common/types/auth-user.js';
import {
  IntegrationsService,
  type IntegrationView,
  type MutationAuditContext,
} from './integrations.service.js';
import { UpdateIntegrationDto } from './dto/update-integration.dto.js';

/**
 * Admin integrations management (M-INTEGRATIONS-1). Reading is open to
 * ADMINs with the «integrations» permission — but only through the
 * sanitized view (secrets collapse to `clientSecretConfigured` flags and
 * are NEVER returned). Every mutation — configuration, secrets,
 * enable/disable, reset — is SUPER_ADMIN-only: OAuth credentials are
 * system credentials, and the current permission system has no field-level
 * granularity (granular ADMIN writes = a later phase, no DB change needed).
 */
@ApiTags('admin/integrations')
@ApiBearerAuth()
@Controller('admin/integrations')
export class AdminIntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  @Roles(Role.ADMIN)
  @RequirePermissions('integrations')
  list(): Promise<IntegrationView[]> {
    return this.integrationsService.list();
  }

  @Get(':provider')
  @Roles(Role.ADMIN)
  @RequirePermissions('integrations')
  find(@Param('provider') provider: string): Promise<IntegrationView> {
    return this.integrationsService.find(provider);
  }

  @Put(':provider')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  update(
    @Param('provider') provider: string,
    @Body() dto: UpdateIntegrationDto,
    @CurrentUser() actor: AuthUser,
    @Req() request: Request,
  ): Promise<IntegrationView> {
    const audit: MutationAuditContext = {
      actor: auditActorFromAuthUser(actor),
      request: auditRequestContext(request),
    };
    return this.integrationsService.update(provider, dto, audit);
  }

  /** Explicit secret removal (an empty secret in PUT never deletes). */
  @Delete(':provider/secrets/:name')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  removeSecret(
    @Param('provider') provider: string,
    @Param('name') name: string,
    @CurrentUser() actor: AuthUser,
    @Req() request: Request,
  ): Promise<IntegrationView> {
    return this.integrationsService.removeSecret(provider, name, {
      actor: auditActorFromAuthUser(actor),
      request: auditRequestContext(request),
    });
  }

  /** Reset: drops the stored configuration; the integration falls back to
   * its not-configured defaults. */
  @Delete(':provider')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('provider') provider: string,
    @CurrentUser() actor: AuthUser,
    @Req() request: Request,
  ): Promise<void> {
    return this.integrationsService.remove(provider, {
      actor: auditActorFromAuthUser(actor),
      request: auditRequestContext(request),
    });
  }
}
