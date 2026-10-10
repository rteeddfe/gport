import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}

/** Second step of claiming a passwordless (guest-checkout) account: the
 * code that was sent to the mailbox. The password is NOT resent — it was
 * kept (bcrypt) in the challenge row at register time and is applied to
 * the User only on success. */
export class VerifyRegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Код — 6 цифр' })
  code: string;
}
