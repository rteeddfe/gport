import { IsBoolean, IsObject, IsOptional } from 'class-validator';

/** Full-object PUT from the admin store-settings form. `providers` is a
 * loose record — the service sanitizes it against PAYMENT_PROVIDERS
 * (unknown ids dropped, config values stringified and trimmed), the
 * client is never trusted. */
export class UpdatePaymentSettingsDto {
  @IsBoolean()
  testEnabled: boolean;

  @IsOptional()
  @IsObject()
  providers?: Record<string, { enabled: boolean; config: Record<string, string> }>;
}
