import { Type } from 'class-transformer';
import { SupportTicketStatus } from '../../generated/prisma/client.js';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class FindTicketsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;
}
