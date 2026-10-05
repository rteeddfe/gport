import {
  ArrayMaxSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Bulk replace of the auto-delivery keys (unsold ones). One key per
 * line on the admin form — the client sends them as an array. */
export class ReplaceProductKeysDto {
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(200, { each: true })
  keys: string[];
}
