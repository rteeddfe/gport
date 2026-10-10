import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';

export enum ProductSort {
  POPULAR = 'popular',
  NEW = 'new',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  DISCOUNT = 'discount',
}

/** Filters for the public catalog. Public reads always see PUBLISHED only. */
export class FindProductsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  categorySlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  /** Comma-separated registry slugs (multi-select in the sidebar). */
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*(?:,[a-z0-9]+(?:-[a-z0-9]+)*)*$/)
  @MaxLength(200)
  platform?: string;

  /** Comma-separated registry slugs (multi-select in the sidebar). */
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*(?:,[a-z0-9]+(?:-[a-z0-9]+)*)*$/)
  @MaxLength(200)
  genre?: string;

  /** «Только со скидкой»: oldPriceCents must be set. */
  @IsOptional()
  @IsIn(['1', 'true'])
  sale?: '1' | 'true';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceMax?: number;

  @IsOptional()
  @IsEnum(ProductSort)
  sort?: ProductSort;
}
