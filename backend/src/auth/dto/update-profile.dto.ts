import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** PATCH /auth/me — self-service profile fields. avatarUrl is an app path
 * or an uploaded /files/:id URL (the ImageUpload field) or an https URL;
 * an empty string clears the field. Undefined fields stay unchanged. */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^($|\/|https?:\/\/)/, {
    message: 'avatarUrl must be an app path or an http(s) URL',
  })
  avatarUrl?: string;
}
