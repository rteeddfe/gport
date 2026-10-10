import { IsBoolean, IsObject, IsOptional } from 'class-validator';

/** SUPER_ADMIN-only PUT body of an integration. `config` is a loose
 * record — the service validates it against the integration registry
 * (unknown/secret field names are rejected). A secret that is absent or
 * empty leaves the stored secret untouched; replacing a secret means
 * sending a non-empty value, removing one is the dedicated DELETE
 * /admin/integrations/:provider/secrets/:name action. */
export class UpdateIntegrationDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, string>;

  @IsOptional()
  @IsObject()
  secrets?: Record<string, string>;
}
