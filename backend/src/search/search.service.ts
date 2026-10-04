import { Injectable } from '@nestjs/common';
import { ProductStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';

export interface SearchSuggestion {
  products: {
    id: string;
    slug: string;
    title: string;
    priceCents: number;
    oldPriceCents: number | null;
    images: string[];
  }[];
  categories: {
    id: string;
    slug: string;
    name: string;
  }[];
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async suggest(q: string): Promise<SearchSuggestion> {
    const contains = { contains: q, mode: 'insensitive' as const };
    const [products, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: { status: ProductStatus.PUBLISHED, title: contains },
        select: {
          id: true,
          slug: true,
          title: true,
          priceCents: true,
          oldPriceCents: true,
          images: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.category.findMany({
        where: { name: contains },
        select: { id: true, slug: true, name: true },
        orderBy: { name: 'asc' },
        take: 3,
      }),
    ]);
    return { products, categories };
  }
}
