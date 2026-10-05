import { SupportTicketStatus } from '../../generated/prisma/client.js';
import { IsEnum } from 'class-validator';

export type { SupportTicketStatus };

export class AdminUpdateTicketDto {
  @IsEnum(SupportTicketStatus)
  status: SupportTicketStatus;
}
