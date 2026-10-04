import { Body, Controller, Get, Ip, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { FindReviewsDto } from './dto/find-reviews.dto.js';
import {
  PaginatedReviews,
  ReviewsService,
} from './reviews.service.js';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /** Published reviews only, newest first (the homepage takes the first
   * page; /reviews paginates). */
  @Public()
  @Get()
  findMany(@Query() query: FindReviewsDto): Promise<PaginatedReviews> {
    return this.reviewsService.findMany(query);
  }

  /** Anonymous submission from the storefront; lands in PENDING. The IP
   * feeds the rate limits (1/minute per IP, 40/hour globally). */
  @Public()
  @Post()
  create(@Body() dto: CreateReviewDto, @Ip() ip: string) {
    return this.reviewsService.create(dto, ip);
  }
}
