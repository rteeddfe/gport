import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { sanitizeRichText } from '../common/utils/sanitize.js';
import { Prisma } from '../generated/prisma/client.js';
import type { CreatePolicyDto, UpdatePolicyDto } from './dto/policy.dto.js';

export interface PolicySummary {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
  updatedAt: Date;
}

export type PolicyPage = Required<
  PolicySummary & { content: string; createdAt: Date }
>;

@Injectable()
export class PoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public list without the heavy content field. */
  findMany(): Promise<PolicySummary[]> {
    return this.prisma.policyPage.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        sortOrder: true,
        updatedAt: true,
      },
    });
  }

  async findBySlug(slug: string): Promise<PolicyPage> {
    const doc = await this.prisma.policyPage.findUnique({ where: { slug } });
    if (!doc) {
      throw new NotFoundException('Policy page not found');
    }
    return doc;
  }

  async create(dto: CreatePolicyDto): Promise<PolicyPage> {
    const exists = await this.prisma.policyPage.findUnique({
      where: { slug: dto.slug },
      select: { id: true },
    });
    if (exists) {
      throw new ConflictException(`Slug "${dto.slug}" already exists`);
    }
    return this.prisma.policyPage.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        content: sanitizeRichText(dto.content),
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdatePolicyDto): Promise<PolicyPage> {
    if (dto.slug) {
      const exists = await this.prisma.policyPage.findUnique({
        where: { slug: dto.slug },
        select: { id: true },
      });
      if (exists && exists.id !== id) {
        throw new ConflictException(`Slug "${dto.slug}" already exists`);
      }
    }
    try {
      return await this.prisma.policyPage.update({
        where: { id },
        data: {
          ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.content !== undefined
            ? { content: sanitizeRichText(dto.content) }
            : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
      });
    } catch (cause) {
      // Only a missing row maps to 404 — an outage keeps its 500.
      if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2025') {
        throw new NotFoundException('Policy page not found');
      }
      throw cause;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.policyPage.delete({ where: { id } });
    } catch (cause) {
      if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2025') {
        throw new NotFoundException('Policy page not found');
      }
      throw cause;
    }
  }
}
