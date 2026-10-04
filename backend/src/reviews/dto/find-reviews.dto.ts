import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { ReviewStatus } from '../../generated/prisma/client.js';

export class FindReviewsDto {
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
}

/** The admin list additionally filters by status (public reads always see
 * PUBLISHED only). */
export class AdminFindReviewsDto extends FindReviewsDto {
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;
}
