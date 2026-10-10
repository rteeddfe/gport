import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { TrafficService } from './traffic.service.js';

/**
 * First line of the API defense: runs before every controller — banned
 * IPs get an immediate 403 without touching any business code, everyone
 * else is counted in the sliding window (which also feeds the auto-ban).
 */
@Injectable()
export class TrafficMiddleware implements NestMiddleware {
  constructor(private readonly trafficService: TrafficService) {}

  use(req: { ip?: string }, res: { status(code: number): { json(body: unknown): void } }, next: () => void): void {
    const ip = req.ip ?? 'unknown';
    void this.trafficService.handle(ip).then((allowed) => {
      if (!allowed) {
        res.status(403).json({
          statusCode: 403,
          message: 'Доступ заблокирован. Если это ошибка — напишите в поддержку.',
        });
        return;
      }
      next();
    });
  }
}
