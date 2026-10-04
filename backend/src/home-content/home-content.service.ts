import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import type { UpdateHomeContentDto } from './dto/update-home-content.dto.js';

export interface HomeContentView {
  kicker: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  tiles: string[];
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
    const { tiles, ...rest } = row;
    return { ...rest, tiles: (tiles as unknown as string[]) ?? [] };
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
    };
    const row = await this.prisma.homeContent.upsert({
      where: { id: HOME_ID },
      update: data,
      create: { id: HOME_ID, ...data },
    });
    const { tiles: savedTiles, ...rest } = row;
    return { ...rest, tiles: (savedTiles as unknown as string[]) ?? [] };
  }
}
