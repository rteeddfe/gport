import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AccountFieldKind } from '../generated/prisma/client.js';
import type { ServiceRefDto, UpdateHomeContentDto } from './dto/update-home-content.dto.js';

export interface HomeWallCard {
  imageUrl: string;
  href: string;
}

/** A resolved service reference: the picked product's public fields the
 * home blocks render (form select and the service wall tiles). */
export interface HomeServiceCard {
  productId: string;
  /** Admin-uploaded mini logo override; null = use the product cover. */
  iconUrl: string | null;
  slug: string;
  title: string;
  /** TOPUP_AMOUNT lower bound or the base price (kopecks) — «от N ₽». */
  priceFromCents: number;
  commissionPercent: number;
  image: string | null;
  /** Checkout account field of the product (form rendering). */
  accountFieldKind: AccountFieldKind | null;
  accountFieldLabel: string | null;
  accountFieldHint: string | null;
  /** TOPUP_AMOUNT upper bound (kopecks); null otherwise. */
  maxValue: number | null;
}

export interface HomeContentView {
  kicker: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  tiles: string[];
  wallCards: HomeWallCard[];
  carouselCards: HomeWallCard[];
  topupServices: HomeServiceCard[];
  serviceCards: HomeServiceCard[];
  updatedAt: Date;
}

const HOME_ID = 1;

@Injectable()
export class HomeContentService {
  constructor(private readonly prisma: PrismaService) {}

  /** Self-healing read: creates the singleton row on first access. */
  async find(): Promise<HomeContentView> {
    const row =
      (await this.prisma.homeContent.findUnique({ where: { id: HOME_ID } })) ??
      (await this.prisma.homeContent.create({ data: { id: HOME_ID } }));
    return this.toView(row);
  }

  async update(dto: UpdateHomeContentDto): Promise<HomeContentView> {
    const data = {
      kicker: dto.kicker,
      title: dto.title,
      titleAccent: dto.titleAccent,
      subtitle: dto.subtitle ?? '',
      ctaLabel: dto.ctaLabel,
      ctaHref: dto.ctaHref,
      tiles: dto.tiles as unknown as Prisma.InputJsonValue,
      wallCards: dto.wallCards as unknown as Prisma.InputJsonValue,
      carouselCards: dto.carouselCards as unknown as Prisma.InputJsonValue,
      topupServices: dto.topupServices as unknown as Prisma.InputJsonValue,
      serviceCards: dto.serviceCards as unknown as Prisma.InputJsonValue,
    };
    const row = await this.prisma.homeContent.upsert({
      where: { id: HOME_ID },
      update: data,
      create: { id: HOME_ID, ...data },
    });
    return this.toView(row);
  }

  /** Resolves service refs against PUBLISHED products; unknown or
   * unpublished products drop out of the view silently. */
  private async resolveServices(refs: ServiceRefDto[]): Promise<HomeServiceCard[]> {
    const ids = [...new Set(refs.map((ref) => ref.productId))];
    if (ids.length === 0) {
      return [];
    }
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, status: 'PUBLISHED' },
      select: {
        id: true,
        slug: true,
        title: true,
        images: true,
        minValue: true,
        maxValue: true,
        priceCents: true,
        commissionPercent: true,
        accountFieldKind: true,
        accountFieldLabel: true,
        accountFieldHint: true,
      },
    });
    const byId = new Map(products.map((product) => [product.id, product]));
    const iconByProduct = new Map(
      refs.filter((ref) => ref.iconUrl).map((ref) => [ref.productId, ref.iconUrl as string]),
    );
    return refs
      .map((ref) => {
        const product = byId.get(ref.productId);
        if (!product) {
          return null;
        }
        return {
          productId: product.id,
          iconUrl: iconByProduct.get(product.id) ?? null,
          slug: product.slug,
          title: product.title,
          priceFromCents: product.minValue ?? product.priceCents,
          commissionPercent: product.commissionPercent,
          image: product.images.at(0) ?? null,
          accountFieldKind: product.accountFieldKind,
          accountFieldLabel: product.accountFieldLabel,
          accountFieldHint: product.accountFieldHint,
          maxValue: product.maxValue,
        } satisfies HomeServiceCard;
      })
      .filter((card): card is HomeServiceCard => card !== null);
  }

  private async toView(row: {
    kicker: string;
    title: string;
    titleAccent: string;
    subtitle: string;
    ctaLabel: string;
    ctaHref: string;
    tiles: Prisma.JsonValue;
    wallCards: Prisma.JsonValue;
    carouselCards: Prisma.JsonValue;
    topupServices: Prisma.JsonValue;
    serviceCards: Prisma.JsonValue;
    updatedAt: Date;
  }): Promise<HomeContentView> {
    const [topupServices, serviceCards] = await Promise.all([
      this.resolveServices((row.topupServices as unknown as ServiceRefDto[]) ?? []),
      this.resolveServices((row.serviceCards as unknown as ServiceRefDto[]) ?? []),
    ]);
    return {
      kicker: row.kicker,
      title: row.title,
      titleAccent: row.titleAccent,
      subtitle: row.subtitle,
      ctaLabel: row.ctaLabel,
      ctaHref: row.ctaHref,
      tiles: (row.tiles as unknown as string[]) ?? [],
      wallCards: (row.wallCards as unknown as HomeWallCard[]) ?? [],
      carouselCards: (row.carouselCards as unknown as HomeWallCard[]) ?? [],
      topupServices,
      serviceCards,
      updatedAt: row.updatedAt,
    };
  }
}
