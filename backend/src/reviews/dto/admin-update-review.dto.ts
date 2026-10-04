import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ReviewStatus } from '../../generated/prisma/client.js';
import { CreateReviewDto } from './create-review.dto.js';

/** Admin moderation: change the status and/or edit the review content
 * (author, rating, text). Every field is optional — absent fields stay
 * untouched, exactly like the product/category PATCHes. */
export class AdminUpdateReviewDto extends PartialType(CreateReviewDto) {
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;
}
