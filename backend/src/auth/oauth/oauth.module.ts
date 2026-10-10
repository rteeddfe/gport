import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../../integrations/integrations.module.js';
import { OAuthStateService } from './oauth-state.service.js';
import { YandexOAuthService } from './yandex-oauth.service.js';
import { VkOAuthService } from './vk-oauth.service.js';

/** OAuth login (M-OAUTH): the state/PKCE machinery and the Yandex/VK
 * adapters. Since M-INTEGRATIONS-2 the adapters resolve their effective
 * configuration through IntegrationRuntimeService (DB-first, documented
 * ENV fallback) — hence the IntegrationsModule import. The controller
 * hangs off AuthModule. */
@Module({
  imports: [IntegrationsModule],
  providers: [OAuthStateService, YandexOAuthService, VkOAuthService],
  exports: [OAuthStateService, YandexOAuthService, VkOAuthService],
})
export class OAuthModule {}
