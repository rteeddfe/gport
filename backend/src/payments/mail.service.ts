import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

export interface QueuedEmail {
  orderId?: string | null;
  to: string;
  subject: string;
  body: string;
}

/**
 * Transactional letters. There is no SMTP provider connected yet — the
 * outbox IS the delivery: every letter lands in EmailLog (visible in the
 * admin store settings) and is logged, so the order/acquiring flow is
 * testable end-to-end. Wire a real transport here when SMTP appears.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly prisma: PrismaService) {}

  async queue(email: QueuedEmail): Promise<void> {
    await this.prisma.emailLog.create({
      data: {
        orderId: email.orderId ?? null,
        to: email.to,
        subject: email.subject,
        body: email.body,
      },
    });
    this.logger.log(`Letter queued to ${email.to}: ${email.subject}`);
  }
}
