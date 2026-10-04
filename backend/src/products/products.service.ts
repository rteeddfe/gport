import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '../generated/prisma/client.js';
import { slugify } from '../common/utils/slugify.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AdminFindProductsDto } from './dto/admin-find-products.dto.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import { ProductSort } from './dto/find-products.dto.js';
import type { FindProductsDto } from './dto/find-products.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';

export type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: true };
}>;

export interface PaginatedProducts {
  items: ProductWithCategory[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ProductDetail extends ProductWithCategory {
  related: ProductWithCategory[];
}

const RELATED_LIMIT = 8;
const DEFAULT_LIMIT = 10;

function orderByFor(
  sort: ProductSort | undefined,
): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case ProductSort.PRICE_ASC:
      return [{ priceCents: 'asc' }, { createdAt: 'desc' }];
    case ProductSort.PRICE_DESC:
      return [{ priceCents: 'desc' }, { createdAt: 'desc' }];
    default:
      return [{ createdAt: 'desc' }];
  }
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: FindProductsDto): Promise<PaginatedProducts> {
    return this.list(this.publicWhere(query), query, orderByFor(query.sort));
  }

  async findManyAdmin(query: AdminFindProductsDto): Promise<PaginatedProducts> {
    const where: Prisma.ProductWhereInput = {
      ...this.publicWhere(query),
      status: query.status,
      categoryId: query.categoryId,
    };
    return this.list(where, query, orderByFor(query.sort));
  }

  async findBySlug(slug: string): Promise<ProductDetail> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { category: true },
    });
    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw new NotFoundException('Product not found');
    }
    const related = await this.prisma.product.findMany({
      where: {
        status: ProductStatus.PUBLISHED,
        categoryId: product.categoryId,
        id: { not: product.id },
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: RELATED_LIMIT,
    });
    return { ...product, related };
  }

  async findOne(id: string): Promise<ProductWithCategory> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async create(dto: CreateProductDto): Promise<ProductWithCategory> {
    await this.ensureCategoryExists(dto.categoryId);
    return this.prisma.product.create({
      data: {
        title: dto.title,
        slug: dto.slug ?? slugify(dto.title),
        description: dto.description ?? null,
        instruction: dto.instruction ?? null,
        region: dto.region ?? null,
        platform: dto.platform ?? null,
        genre: dto.genre ?? [],
        localization: dto.localization ?? null,
        ageRating: dto.ageRating ?? null,
        images: dto.images ?? [],
        priceCents: dto.priceCents,
        oldPriceCents: dto.oldPriceCents ?? null,
        stock: dto.stock,
        currency: dto.currency ?? 'RUB',
        status: dto.status ?? 'DRAFT',
        categoryId: dto.categoryId,
      },
      include: { category: true },
    });
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductWithCategory> {
    await this.findOne(id);
    if (dto.categoryId !== undefined) {
      await this.ensureCategoryExists(dto.categoryId);
    }
    return this.prisma.product.update({
      where: { id },
      data: {
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        instruction: dto.instruction,
        region: dto.region,
        platform: dto.platform,
        genre: dto.genre,
        localization: dto.localization,
        ageRating: dto.ageRating,
        images: dto.images,
        priceCents: dto.priceCents,
        oldPriceCents: dto.oldPriceCents,
        stock: dto.stock,
        currency: dto.currency,
        status: dto.status,
        categoryId: dto.categoryId,
      },
      include: { category: true },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
  }

  /** Filters shared by the public catalog and the admin list. The public
   * catalog always sees PUBLISHED only; the admin list overrides status. */
  private publicWhere(query: FindProductsDto): Prisma.ProductWhereInput {
    return {
      status: ProductStatus.PUBLISHED,
      ...(query.categorySlug ? { category: { slug: query.categorySlug } } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.region ? { region: query.region } : {}),
      ...(query.platform ? { platform: query.platform } : {}),
      ...(query.genre ? { genre: { has: query.genre } } : {}),
      ...(query.priceMin !== undefined || query.priceMax !== undefined
        ? {
            priceCents: {
              ...(query.priceMin !== undefined ? { gte: query.priceMin } : {}),
              ...(query.priceMax !== undefined ? { lte: query.priceMax } : {}),
            },
          }
        : {}),
    };
  }

  private async list(
    where: Prisma.ProductWhereInput,
    query: FindProductsDto,
    orderBy: Prisma.ProductOrderByWithRelationInput[],
  ): Promise<PaginatedProducts> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: true },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException({
        message: 'Category not found',
        errors: { categoryId: ['Category does not exist'] },
      });
    }
  }
}
