import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  Prisma,
  ProductFaq,
  ProductKind,
  ProductStatus,
} from '../generated/prisma/client.js';
import { slugify } from '../common/utils/slugify.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AdminFindProductsDto } from './dto/admin-find-products.dto.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import { ProductSort } from './dto/find-products.dto.js';
import type { FindProductsDto } from './dto/find-products.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';

export type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: true; variants: true };
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
  /** Buyer FAQ of this product (public, ordered). */
  faq: ProductFaq[];
}

const RELATED_LIMIT = 8;
const DEFAULT_LIMIT = 10;

const PRODUCT_INCLUDE = { category: true, variants: { orderBy: { sortOrder: 'asc' as const } } };

/** Cached discount percent for the «По скидке» sort: recomputed whenever
 * priceCents/oldPriceCents are written. 0 without a valid old price. */
function discountPercentOf(
  priceCents: number,
  oldPriceCents: number | null | undefined,
): number {
  if (!oldPriceCents || oldPriceCents <= priceCents) return 0;
  return Math.round(((oldPriceCents - priceCents) / oldPriceCents) * 100);
}

/** Prisma Json input: undefined = leave untouched, null = DB NULL. */
function jsonInput(value: Record<string, unknown> | null | undefined) {
  if (value === undefined) return undefined;
  return value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

function orderByFor(
  sort: ProductSort | undefined,
): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case ProductSort.PRICE_ASC:
      return [{ priceCents: 'asc' }, { createdAt: 'desc' }];
    case ProductSort.PRICE_DESC:
      return [{ priceCents: 'desc' }, { createdAt: 'desc' }];
    case ProductSort.DISCOUNT:
      return [{ discountPercent: 'desc' }, { createdAt: 'desc' }];
    // «Популярные» is the catalog default; until a real popularity signal
    // exists it matches the recency order.
    case ProductSort.POPULAR:
    case ProductSort.NEW:
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
      include: {
        ...PRODUCT_INCLUDE,
        faq: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw new NotFoundException('Product not found');
    }
    const related = await this.prisma.product.findMany({
      where: {
        status: ProductStatus.PUBLISHED,
        id: { not: product.id },
        // «Похожие игры»: same primary genre, falling back to the section
        // for products without genres (top-ups, subscriptions).
        ...(product.genre.length > 0
          ? { genre: { has: product.genre[0] } }
          : { categoryId: product.categoryId }),
      },
      include: PRODUCT_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: RELATED_LIMIT,
    });
    const { faq, ...rest } = product;
    return { ...rest, related, faq };
  }

  async findOne(id: string): Promise<ProductWithCategory> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDE,
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async create(dto: CreateProductDto): Promise<ProductWithCategory> {
    await this.ensureCategoryExists(dto.categoryId);
    this.ensureKindInvariants(
      dto.kind ?? 'GAME_KEY',
      dto.status ?? 'DRAFT',
      dto.minValue,
      dto.maxValue,
      dto.variants,
    );
    const { variants, ...rest } = dto;
    return this.prisma.product.create({
      data: {
        title: rest.title,
        slug: rest.slug ?? slugify(rest.title),
        description: rest.description ?? null,
        instruction: rest.instruction ?? null,
        platform: rest.platform ?? null,
        genre: rest.genre ?? [],
        images: rest.images ?? [],
        priceCents: rest.priceCents,
        oldPriceCents: rest.oldPriceCents ?? null,
        discountPercent: discountPercentOf(rest.priceCents, rest.oldPriceCents),
        cashbackPercent: rest.cashbackPercent ?? 0,
        releaseYear: rest.releaseYear ?? null,
        rating: rest.rating ?? null,
        consoles: rest.consoles ?? [],
        tags: rest.tags ?? [],
        tagline: rest.tagline ?? null,
        group: rest.group ?? null,
        features: rest.features ?? [],
        searchAliases: rest.searchAliases ?? [],
        systemRequirements: jsonInput(rest.systemRequirements),
        stock: rest.stock,
        status: rest.status ?? 'DRAFT',
        kind: rest.kind ?? 'GAME_KEY',
        minValue: rest.minValue ?? null,
        maxValue: rest.maxValue ?? null,
        commissionPercent: rest.commissionPercent ?? 0,
        creditingMode: rest.creditingMode ?? 'AUTO_CODE',
        accountFieldKind: rest.accountFieldKind ?? null,
        accountFieldLabel: rest.accountFieldLabel ?? null,
        accountFieldHint: rest.accountFieldHint ?? null,
        externalId: rest.externalId ?? null,
        categoryId: rest.categoryId,
        variants: variants
          ? {
              create: variants.map((variant, index) => ({
                label: variant.label,
                value: variant.value ?? null,
                unit: variant.unit ?? null,
                priceCents: variant.priceCents,
                oldPriceCents: variant.oldPriceCents ?? null,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: PRODUCT_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductWithCategory> {
    const current = await this.findOne(id);
    if (dto.categoryId !== undefined) {
      await this.ensureCategoryExists(dto.categoryId);
    }
    this.ensureKindInvariants(
      dto.kind ?? current.kind,
      dto.status ?? current.status,
      dto.minValue ?? current.minValue,
      dto.maxValue ?? current.maxValue,
      // When the patch does not replace the variant list, the current
      // nominals stay — validate against them.
      dto.variants ?? current.variants,
    );
    const { variants, ...rest } = dto;
    return this.prisma.product.update({
      where: { id },
      data: {
        title: rest.title,
        slug: rest.slug,
        description: rest.description,
        instruction: rest.instruction,
        platform: rest.platform,
        genre: rest.genre,
        images: rest.images,
        priceCents: rest.priceCents,
        oldPriceCents: rest.oldPriceCents,
        discountPercent:
          rest.priceCents !== undefined || rest.oldPriceCents !== undefined
            ? discountPercentOf(
                rest.priceCents ?? current.priceCents,
                rest.oldPriceCents !== undefined
                  ? rest.oldPriceCents
                  : current.oldPriceCents,
              )
            : undefined,
        cashbackPercent: rest.cashbackPercent,
        releaseYear: rest.releaseYear,
        rating: rest.rating,
        consoles: rest.consoles,
        tags: rest.tags,
        tagline: rest.tagline,
        group: rest.group,
        features: rest.features,
        searchAliases: rest.searchAliases,
        systemRequirements: jsonInput(rest.systemRequirements),
        stock: rest.stock,
        status: rest.status,
        kind: rest.kind,
        minValue: rest.minValue,
        maxValue: rest.maxValue,
        commissionPercent: rest.commissionPercent,
        creditingMode: rest.creditingMode,
        accountFieldKind: rest.accountFieldKind,
        accountFieldLabel: rest.accountFieldLabel,
        accountFieldHint: rest.accountFieldHint,
        externalId: rest.externalId,
        categoryId: rest.categoryId,
        variants: variants
          ? {
              // Full replace on save (the admin form submits the whole
              // nominal list), display order = list order.
              deleteMany: {},
              create: variants.map((variant, index) => ({
                label: variant.label,
                value: variant.value ?? null,
                unit: variant.unit ?? null,
                priceCents: variant.priceCents,
                oldPriceCents: variant.oldPriceCents ?? null,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: PRODUCT_INCLUDE,
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
              // Folk search terms («пс плюс», «гпт») — exact alias hit;
              // title/description stays the fuzzy path.
              { searchAliases: { has: query.search } },
            ],
          }
        : {}),
      // Sidebar multi-selects: comma-separated registry slugs.
      ...(query.platform ? { platform: { in: query.platform.split(',') } } : {}),
      ...(query.genre ? { genre: { hasSome: query.genre.split(',') } } : {}),
      ...(query.sale ? { oldPriceCents: { not: null } } : {}),
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
        include: PRODUCT_INCLUDE,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /** Publishing rules per kind: a TOPUP_NOMINAL product needs at least
   * one nominal, a TOPUP_AMOUNT product needs a valid range. Drafts may
   * be incomplete. */
  private ensureKindInvariants(
    kind: ProductKind,
    status: ProductStatus,
    minValue?: number | null,
    maxValue?: number | null,
    variants?: { label: string; priceCents: number }[],
  ): void {
    if (status !== ProductStatus.PUBLISHED) {
      return;
    }
    if (kind === ProductKind.TOPUP_NOMINAL && (variants?.length ?? 0) === 0) {
      throw new BadRequestException(
        'Добавьте хотя бы один номинал перед публикацией',
      );
    }
    if (kind === ProductKind.TOPUP_AMOUNT) {
      if (minValue == null || maxValue == null || minValue >= maxValue) {
        throw new BadRequestException(
          'Укажите диапазон суммы: минимум меньше максимума',
        );
      }
    }
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

  /** Auto-delivery stock of a product: the not-yet-sold keys (in paste
   * order) plus counters. */
  /** Key pool of a product for the admin form. The listing is bounded
   * (a product can accumulate thousands of keys) while available/sold
   * come from cheap indexed counts and stay accurate beyond the page. */
  async listKeys(id: string): Promise<{
    keys: { id: string; value: string; isSold: boolean }[];
    available: number;
    sold: number;
  }> {
    await this.ensureExists(id);
    const [keys, available, sold] = await Promise.all([
      this.prisma.productKey.findMany({
        where: { productId: id },
        orderBy: { createdAt: 'asc' },
        take: 500,
        select: { id: true, value: true, isSold: true },
      }),
      this.prisma.productKey.count({ where: { productId: id, isSold: false } }),
      this.prisma.productKey.count({ where: { productId: id, isSold: true } }),
    ]);
    return { keys, available, sold };
  }

  /** Replaces the UNSOLD keys with the pasted list (sold keys are history
   * and stay). Deduplicates; sold values that reappear are ignored.
   * Refuses to run while AWAITING_PAYMENT orders of this product still
   * hold their stock reservation: those orders have no key of their own
   * yet (the claim happens at payment), so deleting the pool could leave
   * a paid order undeliverable. The whole check+delete+create runs in one
   * transaction — a rejection rolls back nothing because nothing was
   * written, and the post-write re-check makes an order created in
   * between abort the whole replacement (rollback restores the keys). */
  async replaceKeys(id: string, values: string[]): Promise<void> {
    await this.ensureExists(id);
    const seen = new Set<string>();
    const fresh: string[] = [];
    for (const value of values) {
      const clean = value.trim();
      if (clean.length === 0 || seen.has(clean)) continue;
      seen.add(clean);
      fresh.push(clean);
    }
    const activeOrderFilter = {
      items: {
        some: {
          productId: id,
          product: { creditingMode: 'AUTO_CODE' as const },
        },
      },
    };
    await this.prisma.$transaction(async (tx) => {
      const assertNoAwaitingOrders = async (): Promise<void> => {
        const active = await tx.order.count({
          where: { status: OrderStatus.AWAITING_PAYMENT, ...activeOrderFilter },
        });
        if (active > 0) {
          throw new ConflictException(
            'Нельзя заменить ключи: есть активные заказы, ожидающие оплаты',
          );
        }
      };
      await assertNoAwaitingOrders();
      await tx.productKey.deleteMany({
        where: { productId: id, isSold: false },
      });
      await tx.productKey.createMany({
        data: fresh.map((value) => ({ productId: id, value })),
      });
      // Re-check after the writes: a checkout committed in between aborts
      // the transaction, so the old keys are restored, never half-swapped.
      await assertNoAwaitingOrders();
    });
  }

  /** Per-product FAQ (admin): full replace on save, display order =
   * list order. */
  async listFaq(id: string): Promise<ProductFaq[]> {
    await this.ensureExists(id);
    return this.prisma.productFaq.findMany({
      where: { productId: id },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async replaceFaq(
    id: string,
    items: { question: string; answer: string }[],
  ): Promise<void> {
    await this.ensureExists(id);
    const clean = items
      .map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      }))
      .filter((item) => item.question.length > 0 && item.answer.length > 0);
    await this.prisma.$transaction([
      this.prisma.productFaq.deleteMany({ where: { productId: id } }),
      this.prisma.productFaq.createMany({
        data: clean.map((item, index) => ({
          productId: id,
          question: item.question,
          answer: item.answer,
          sortOrder: index,
        })),
      }),
    ]);
  }

  private async ensureExists(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }
}
