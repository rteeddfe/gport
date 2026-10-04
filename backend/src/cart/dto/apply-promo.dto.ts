import { IsString, MaxLength, MinLength } from 'class-validator';

export class ApplyPromoDto {
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  code: string;
}
