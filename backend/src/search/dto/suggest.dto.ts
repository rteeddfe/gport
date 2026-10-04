import { Type } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SuggestDto {
  @Type(() => String)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  q: string;
}
