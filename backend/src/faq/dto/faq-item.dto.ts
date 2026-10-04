import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const FAQ_CATEGORIES = ['topup', 'games'] as const;
export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export class CreateFaqItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  question: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  answer: string;

  @IsIn(FAQ_CATEGORIES)
  category: FaqCategory;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFaqItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  question?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  answer?: string;

  @IsOptional()
  @IsIn(FAQ_CATEGORIES)
  category?: FaqCategory;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
