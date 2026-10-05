import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReviewStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AdminFindReviewsDto } from './dto/find-reviews.dto.js';
import type { AdminUpdateReviewDto } from './dto/admin-update-review.dto.js';
import type { CreateReviewDto } from './dto/create-review.dto.js';
import type { FindReviewsDto } from './dto/find-reviews.dto.js';

export interface PaginatedReviews {
  items: Prisma.ReviewGetPayload<Record<string, never>>[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/** Rate limits of the public submission form. The per-IP counter and the
 * global counter slide over the last minute / hour respectively (DB-backed,
 * so they survive restarts and work across several instances). */
const PER_IP_WINDOW_MS = 60_000;
const GLOBAL_WINDOW_MS = 3_600_000;
const GLOBAL_LIMIT = 40;

const DEFAULT_LIMIT = 10;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public submission: every review lands in PENDING for moderation.
   * Limits: 1 review/minute per IP, 40 reviews/hour across everyone. */
  async create(
    dto: CreateReviewDto,
    ip: string | null,
  ): Promise<Prisma.ReviewGetPayload<Record<string, never>>> {
    const now = Date.now();
    const [sameIpLastMinute, lastHourTotal] = await Promise.all([
      ip
        ? this.prisma.review.count({
            where: { ip, createdAt: { gte: new Date(now - PER_IP_WINDOW_MS) } },
          })
        : Promise.resolve(0),
      this.prisma.review.count({
        where: { createdAt: { gte: new Date(now - GLOBAL_WINDOW_MS) } },
      }),
    ]);
    if (sameIpLastMinute >= 1) {
      throw new HttpException(
        'Можно оставлять не чаще одного отзыва в минуту — попробуйте позже',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (lastHourTotal >= GLOBAL_LIMIT) {
      throw new HttpException(
        'Слишком много отзывов за последний час — попробуйте позже',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.prisma.review.create({
      data: {
        authorName: dto.authorName?.trim() || 'Гость',
        rating: dto.rating,
        text: dto.text,
        ip: ip ?? null,
      },
    });
  }

  async findMany(query: FindReviewsDto): Promise<PaginatedReviews> {
    // The IP is internal moderation data — it never leaves the admin area.
    return this.list({ status: ReviewStatus.PUBLISHED }, query, {
      id: true,
      authorName: true,
      rating: true,
      text: true,
      createdAt: true,
    });
  }

  async findManyAdmin(query: AdminFindReviewsDto): Promise<PaginatedReviews> {
    return this.list({ status: query.status }, query);
  }

  /** Admin moderation: change the status and/or edit the content. Only the
   * sent fields change; an emptied name falls back to «Гость». */
  async update(
    id: string,
    dto: AdminUpdateReviewDto,
  ): Promise<Prisma.ReviewGetPayload<Record<string, never>>> {
    await this.findOne(id);
    return this.prisma.review.update({
      where: { id },
      data: {
        status: dto.status,
        rating: dto.rating,
        text: dto.text,
        ...(dto.authorName !== undefined
          ? { authorName: dto.authorName.trim() || 'Гость' }
          : {}),
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.review.delete({ where: { id } });
  }

  private async findOne(
    id: string,
  ): Promise<Prisma.ReviewGetPayload<Record<string, never>>> {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }

  private async list(
    where: Prisma.ReviewWhereInput,
    query: FindReviewsDto,
    select?: Prisma.ReviewSelect,
  ): Promise<PaginatedReviews> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        ...(select ? { select } : {}),
      }),
      this.prisma.review.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
