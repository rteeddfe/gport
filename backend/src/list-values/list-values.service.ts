import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { slugify } from '../common/utils/slugify.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateListValueDto, UpdateListValueDto } from './dto/list-value.dto.js';

export interface ListValueRow {
  id: string;
  kind: string;
  name: string;
  slug: string;
}

@Injectable()
export class ListValuesService {
  constructor(private readonly prisma: PrismaService) {}

  /** The whole registry (a handful of rows) — the storefront resolves
   * display names from it, the admin edits it per kind. */
  findMany(kind?: string): Promise<ListValueRow[]> {
    return this.prisma.listValue.findMany({
      where: kind ? { kind } : {},
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateListValueDto): Promise<ListValueRow> {
    const slug = dto.slug ?? slugify(dto.name);
    await this.ensureUnique(dto.kind, dto.name, slug);
    return this.prisma.listValue.create({
      data: { kind: dto.kind, name: dto.name, slug },
    });
  }

  async update(id: string, dto: UpdateListValueDto): Promise<ListValueRow> {
    const existing = await this.prisma.listValue.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('List value not found');
    }
    const kind = dto.kind ?? existing.kind;
    const name = dto.name ?? existing.name;
    const slug = dto.slug ?? existing.slug;
    await this.ensureUnique(kind, name, slug, id);
    return this.prisma.listValue.update({
      where: { id },
      data: { kind, name, slug },
    });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.listValue.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('List value not found');
    }
    // Products may still reference the slug — removing the registry row
    // just leaves the value off the selects; nothing breaks downstream.
    await this.prisma.listValue.delete({ where: { id } });
  }

  /** Name+slug are unique per kind (products and filter URLs key on them). */
  private async ensureUnique(
    kind: string,
    name: string,
    slug: string,
    ignoreId?: string,
  ) {
    const [byName, bySlug] = await Promise.all([
      this.prisma.listValue.findUnique({ where: { kind_name: { kind, name } } }),
      this.prisma.listValue.findUnique({ where: { kind_slug: { kind, slug } } }),
    ]);
    if (byName && byName.id !== ignoreId) {
      throw new ConflictException('Value name already exists in this list');
    }
    if (bySlug && bySlug.id !== ignoreId) {
      throw new ConflictException('Value slug already exists in this list');
    }
  }
}
