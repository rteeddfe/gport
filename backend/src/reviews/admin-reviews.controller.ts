import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import { AdminFindReviewsDto } from './dto/find-reviews.dto.js';
import { AdminUpdateReviewDto } from './dto/admin-update-review.dto.js';
import {
  PaginatedReviews,
  ReviewsService,
} from './reviews.service.js';

@ApiTags('admin/reviews')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@RequirePermissions('reviews')
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /** All reviews (every status) with an optional status filter — the
   * moderation queue. */
  @Get()
  findMany(@Query() query: AdminFindReviewsDto): Promise<PaginatedReviews> {
    return this.reviewsService.findManyAdmin(query);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateReviewDto,
  ) {
    return this.reviewsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.reviewsService.remove(id);
  }
}
