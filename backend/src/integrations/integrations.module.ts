import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AdminIntegrationsController } from './admin-integrations.controller.js';
import { IntegrationRuntimeService } from './integration-runtime.service.js';
import { IntegrationSecretService } from './integration-secret.service.js';
import { IntegrationsService } from './integrations.service.js';

@Module({
  imports: [AuditModule],
  controllers: [AdminIntegrationsController],
  providers: [
    IntegrationSecretService,
    IntegrationsService,
    IntegrationRuntimeService,
  ],
  exports: [IntegrationsService, IntegrationSecretService, IntegrationRuntimeService],
})
export class IntegrationsModule {}
