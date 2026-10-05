import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { DiscountType, PromoCode } from '../generated/prisma/client.js';
import type { CreatePromoCodeDto } from './dto/create-promo-code.dto.js';
import type { UpdatePromoCodeDto } from './dto/update-promo-code.dto.js';

export interface PaginatedPromoCodes {
  items: PromoCode[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/** Is the promo usable right now, regardless of the cart subtotal? */
export function isPromoActiveNow(promo: PromoCode, now = new Date()): boolean {
  return (
    promo.isActive &&
    (promo.startsAt === null || promo.startsAt <= now) &&
    (promo.endsAt === null || promo.endsAt >= now) &&
    (promo.maxUses === null || promo.usedCount < promo.maxUses)
  );
}

/** Pure discount calculation, shared by the cart view and future orders. */
export function computeDiscountCents(
  discountType: DiscountType,
  value: number,
  subtotalCents: number,
): number {
  if (subtotalCents <= 0) {
    return 0;
  }
  const discount =
    discountType === 'PERCENT'
      ? Math.floor((subtotalCents * value) / 100)
      : Math.min(value, subtotalCents);
  return Math.min(discount, subtotalCents);
}

const DEFAULT_LIMIT = 20;

/** PATCH date semantics: undefined = keep the current value, null = clear,
 * string = set. The DTO turns empty strings into null. */
function resolveDate(
  dtoValue: string | null | undefined,
  current: Date | null,
): Date | null {
  if (dtoValue === undefined) {
    return current;
  }
  return dtoValue === null ? null : new Date(dtoValue);
}

@Injectable()
export class PromoCodesService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(page = 1, limit = DEFAULT_LIMIT): Promise<PaginatedPromoCodes> {
    const [items, total] = await Promise.all([
      this.prisma.promoCode.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.promoCode.count(),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async create(dto: CreatePromoCodeDto): Promise<PromoCode> {
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    this.validateRanges(dto.discountType, dto.value, endsAt, startsAt);
    return this.prisma.promoCode.create({
      data: {
        code: dto.code,
        discountType: dto.discountType,
        value: dto.value,
        isActive: dto.isActive ?? true,
        startsAt,
        endsAt,
        maxUses: dto.maxUses ?? null,
        minSubtotalCents: dto.minSubtotalCents ?? null,
      },
    });
  }

  async update(id: string, dto: UpdatePromoCodeDto): Promise<PromoCode> {
    const existing = await this.getExisting(id);
    const discountType = dto.discountType ?? existing.discountType;
    const value = dto.value ?? existing.value;
    const startsAt = resolveDate(dto.startsAt, existing.startsAt);
    const endsAt = resolveDate(dto.endsAt, existing.endsAt);
    this.validateRanges(discountType, value, endsAt, startsAt);
    return this.prisma.promoCode.update({
      where: { id },
      data: {
        code: dto.code,
        discountType: dto.discountType,
        value: dto.value,
        isActive: dto.isActive,
        startsAt: dto.startsAt === undefined ? undefined : startsAt,
        endsAt: dto.endsAt === undefined ? undefined : endsAt,
        maxUses: dto.maxUses,
        minSubtotalCents: dto.minSubtotalCents,
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.getExisting(id);
    await this.prisma.promoCode.delete({ where: { id } });
  }

  private async getExisting(id: string): Promise<PromoCode> {
    const promo = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!promo) {
      throw new NotFoundException('Promo code not found');
    }
    return promo;
  }

  private validateRanges(
    discountType: DiscountType,
    value: number,
    endsAt: Date | null | undefined,
    startsAt: Date | null | undefined,
  ): void {
    if (discountType === 'PERCENT' && value > 99) {
      throw new BadRequestException({
        message: 'Invalid promo code',
        errors: { value: ['PERCENT discount must be between 1 and 99'] },
      });
    }
    if (
      startsAt instanceof Date &&
      endsAt instanceof Date &&
      startsAt.getTime() > endsAt.getTime()
    ) {
      throw new BadRequestException({
        message: 'Invalid promo code',
        errors: { endsAt: ['endsAt must be after startsAt'] },
      });
    }
  }
}
