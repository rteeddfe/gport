import { IsString, MaxLength, MinLength } from 'class-validator';

/** POST /auth/password — the current password is verified server-side;
 * other sessions are revoked, the current one stays alive. */
export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}
