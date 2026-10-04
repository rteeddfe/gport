import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { PostStatus } from '../../generated/prisma/client.js';

export class FindPostsDto {
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
export class AdminFindPostsDto extends FindPostsDto {
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;
}
