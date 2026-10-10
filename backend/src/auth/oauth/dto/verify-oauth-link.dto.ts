import { IsString, IsUUID, Matches } from 'class-validator';

/** Link verification request (M-OAUTH-4): ONLY the opaque challenge id
 * and the mailed code. userId/provider/providerUserId/email are taken
 * from the server-side challenge — the frontend can never redirect the
 * link to another account or identity. */
export class VerifyOAuthLinkDto {
  @IsUUID()
  challengeId: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Код — 6 цифр' })
  code: string;
}
