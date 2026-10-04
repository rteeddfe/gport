import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { DiscountType } from '../../generated/prisma/client.js';

export class CreatePromoCodeDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'code must contain only A-Z, 0-9, "_" and "-"',
  })
  code: string;

  @IsEnum(DiscountType)
  discountType: DiscountType;

  /** PERCENT: 1..99 (%), FIXED: amount in kopecks. */
  @IsInt()
  @Min(1)
  value: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Empty string arrives as null: on PATCH null clears the field, on
  // create it means "no limit" (same as omitting the field).
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : value))
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : value))
  @IsDateString()
  endsAt?: string | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : value))
  @IsInt()
  @Min(1)
  maxUses?: number | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : value))
  @IsInt()
  @Min(0)
  minSubtotalCents?: number | null;
}
