import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SupportTicketStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateTicketDto } from './dto/create-ticket.dto.js';
import type { FindTicketsDto } from './dto/find-tickets.dto.js';

export interface TicketView {
  id: string;
  name: string | null;
  contact: string;
  message: string;
  status: SupportTicketStatus;
  createdAt: Date;
}

export interface AdminTicketView extends TicketView {
  ip: string | null;
}

export interface PaginatedTickets {
  items: AdminTicketView[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/** Anti-spam windows for the public form — the same sliding-window model
 * as the reviews (DB-backed, survives restarts, works across instances). */
const PER_IP_WINDOW_MS = 60_000;
const GLOBAL_WINDOW_MS = 3_600_000;
const GLOBAL_LIMIT = 30;

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public submission: rate limited (1/minute per IP, 30/hour globally),
   * stored unassigned for the admin «Обращения» tab. */
  async create(dto: CreateTicketDto, ip: string | null): Promise<TicketView> {
    const now = Date.now();
    const [sameIpLastMinute, lastHourTotal] = await Promise.all([
      ip
        ? this.prisma.supportTicket.count({
            where: { ip, createdAt: { gte: new Date(now - PER_IP_WINDOW_MS) } },
          })
        : Promise.resolve(0),
      this.prisma.supportTicket.count({
        where: { createdAt: { gte: new Date(now - GLOBAL_WINDOW_MS) } },
      }),
    ]);
    if (sameIpLastMinute >= 1) {
      throw new HttpException(
        'Можно отправлять не чаще одного обращения в минуту — попробуйте позже',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (lastHourTotal >= GLOBAL_LIMIT) {
      throw new HttpException(
        'Слишком много обращений за последний час — попробуйте позже',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.prisma.supportTicket.create({
      data: {
        name: dto.name?.trim() || null,
        contact: dto.contact,
        message: dto.message,
        ip: ip ?? null,
      },
      select: { id: true, name: true, contact: true, message: true, status: true, createdAt: true },
    });
  }

  async findManyAdmin(query: FindTicketsDto): Promise<PaginatedTickets> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.SupportTicketWhereInput = { status: query.status };
    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async update(id: string, status: SupportTicketStatus): Promise<AdminTicketView> {
    await this.getExisting(id);
    return this.prisma.supportTicket.update({
      where: { id },
      data: { status },
    });
  }

  async remove(id: string): Promise<void> {
    await this.getExisting(id);
    await this.prisma.supportTicket.delete({ where: { id } });
  }

  private async getExisting(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }
    return ticket;
  }
}
