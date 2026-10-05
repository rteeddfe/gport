import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { slugify } from '../common/utils/slugify.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

export interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  productsCount: number;
}

/** Public/Display counts only count PUBLISHED products — catalog chips
 * and landing cards must not advertise drafts. */
const PUBLISHED_COUNT = { _count: { select: { products: { where: { status: 'PUBLISHED' as const } } } } };

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(): Promise<CategoryWithCount[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: PUBLISHED_COUNT,
    });
    return categories.map(({ _count, ...category }) => ({
      ...category,
      productsCount: _count.products,
    }));
  }

  async create(dto: CreateCategoryDto): Promise<CategoryWithCount> {
    const slug = dto.slug ?? slugify(dto.name);
    await this.ensureUnique(dto.name, slug);
    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description ?? null,
      },
      include: PUBLISHED_COUNT,
    });
    return this.withCount(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryWithCount> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Category not found');
    }
    const name = dto.name ?? existing.name;
    const slug = dto.slug ?? existing.slug;
    await this.ensureUnique(name, slug, id);
    const category = await this.prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        description: dto.description,
      },
      include: PUBLISHED_COUNT,
    });
    return this.withCount(category);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Category not found');
    }
    if (existing._count.products > 0) {
      throw new ConflictException('Category still has products');
    }
    await this.prisma.category.delete({ where: { id } });
  }

  /** The slug is part of the public catalog URLs — PATCH changes it only
   * when the admin sends it explicitly. */
  private async ensureUnique(name: string, slug: string, ignoreId?: string) {
    const [byName, bySlug] = await Promise.all([
      this.prisma.category.findUnique({ where: { name } }),
      this.prisma.category.findUnique({ where: { slug } }),
    ]);
    if (byName && byName.id !== ignoreId) {
      throw new ConflictException('Category name already exists');
    }
    if (bySlug && bySlug.id !== ignoreId) {
      throw new ConflictException('Category slug already exists');
    }
  }

  private withCount(
    category: Omit<CategoryWithCount, 'productsCount'> & {
      _count: { products: number };
    },
  ): CategoryWithCount {
    const { _count, ...rest } = category;
    return { ...rest, productsCount: _count.products };
  }
}
