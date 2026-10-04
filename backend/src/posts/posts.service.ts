import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PostStatus } from '../generated/prisma/client.js';
import { slugify } from '../common/utils/slugify.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AdminFindPostsDto } from './dto/find-posts.dto.js';
import type { CreatePostDto } from './dto/post.dto.js';
import type { FindPostsDto } from './dto/find-posts.dto.js';
import type { UpdatePostDto } from './dto/post.dto.js';

export interface PaginatedPosts {
  items: Prisma.PostGetPayload<Record<string, never>>[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const DEFAULT_LIMIT = 10;

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: FindPostsDto): Promise<PaginatedPosts> {
    return this.list(
      { status: PostStatus.PUBLISHED },
      query,
      [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    );
  }

  async findManyAdmin(query: AdminFindPostsDto): Promise<PaginatedPosts> {
    return this.list(
      { status: query.status },
      query,
      [{ createdAt: 'desc' }],
    );
  }

  async findBySlug(slug: string): Promise<Prisma.PostGetPayload<Record<string, never>>> {
    const post = await this.prisma.post.findUnique({ where: { slug } });
    if (!post || post.status !== PostStatus.PUBLISHED) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async findOne(id: string): Promise<Prisma.PostGetPayload<Record<string, never>>> {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async create(
    dto: CreatePostDto,
  ): Promise<Prisma.PostGetPayload<Record<string, never>>> {
    const slug = dto.slug ?? slugify(dto.title);
    await this.ensureUniqueSlug(slug);
    const status = dto.status ?? PostStatus.DRAFT;
    return this.prisma.post.create({
      data: {
        title: dto.title,
        slug,
        excerpt: dto.excerpt ?? '',
        content: dto.content ?? '',
        coverImageUrl: dto.coverImageUrl ?? null,
        status,
        // First publish stamps the public date; drafts stay undated.
        publishedAt: status === PostStatus.PUBLISHED ? new Date() : null,
      },
    });
  }

  async update(
    id: string,
    dto: UpdatePostDto,
  ): Promise<Prisma.PostGetPayload<Record<string, never>>> {
    const existing = await this.findOne(id);
    const slug = dto.slug ?? existing.slug;
    await this.ensureUniqueSlug(slug, id);
    const status = dto.status ?? existing.status;
    return this.prisma.post.update({
      where: { id },
      data: {
        title: dto.title,
        slug: dto.slug,
        excerpt: dto.excerpt,
        content: dto.content,
        coverImageUrl: dto.coverImageUrl,
        status: dto.status,
        publishedAt:
          status === PostStatus.PUBLISHED && !existing.publishedAt
            ? new Date()
            : undefined,
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.post.delete({ where: { id } });
  }

  /** The slug is part of the public blog URLs — PATCH changes it only
   * when the admin sends it explicitly. */
  private async ensureUniqueSlug(slug: string, ignoreId?: string): Promise<void> {
    const bySlug = await this.prisma.post.findUnique({ where: { slug } });
    if (bySlug && bySlug.id !== ignoreId) {
      throw new ConflictException('Post slug already exists');
    }
  }

  private async list(
    where: Prisma.PostWhereInput,
    query: FindPostsDto,
    orderBy: Prisma.PostOrderByWithRelationInput[],
  ): Promise<PaginatedPosts> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.post.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
