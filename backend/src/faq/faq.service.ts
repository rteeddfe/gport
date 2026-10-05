import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateFaqItemDto, UpdateFaqItemDto } from './dto/faq-item.dto.js';

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: Date;
};

const ITEM_SELECT = {
  id: true,
  question: true,
  answer: true,
  category: true,
  sortOrder: true,
  isActive: true,
  updatedAt: true,
} as const;

const ITEM_ORDER: Prisma.FaqItemOrderByWithRelationInput[] = [
  { sortOrder: 'asc' },
  { createdAt: 'asc' },
];

@Injectable()
export class FaqService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public read: only active items, storefront filter order. */
  findActive(): Promise<FaqItem[]> {
    return this.prisma.faqItem.findMany({
      where: { isActive: true },
      orderBy: ITEM_ORDER,
      select: ITEM_SELECT,
    });
  }

  /** Admin list: everything, including hidden items. */
  findMany(): Promise<FaqItem[]> {
    return this.prisma.faqItem.findMany({
      orderBy: ITEM_ORDER,
      select: ITEM_SELECT,
    });
  }

  create(dto: CreateFaqItemDto): Promise<FaqItem> {
    return this.prisma.faqItem.create({
      data: {
        question: dto.question,
        answer: dto.answer,
        category: dto.category,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      select: ITEM_SELECT,
    });
  }

  async update(id: string, dto: UpdateFaqItemDto): Promise<FaqItem> {
    try {
      return await this.prisma.faqItem.update({
        where: { id },
        data: {
          ...(dto.question !== undefined ? { question: dto.question } : {}),
          ...(dto.answer !== undefined ? { answer: dto.answer } : {}),
          ...(dto.category !== undefined ? { category: dto.category } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        select: ITEM_SELECT,
      });
    } catch (cause) {
      // Only a missing row maps to 404 — an outage keeps its 500.
      if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2025') {
        throw new NotFoundException('FAQ item not found');
      }
      throw cause;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.faqItem.delete({ where: { id } });
    } catch (cause) {
      if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2025') {
        throw new NotFoundException('FAQ item not found');
      }
      throw cause;
    }
  }
}
