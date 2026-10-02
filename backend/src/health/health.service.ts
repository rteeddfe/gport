import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

export interface HealthCheckResult {
  status: 'ok';
  database: 'up' | 'down';
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthCheckResult> {
    return {
      status: 'ok',
      database: await this.checkDatabase(),
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<'up' | 'down'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch {
      return 'down';
    }
  }
}
