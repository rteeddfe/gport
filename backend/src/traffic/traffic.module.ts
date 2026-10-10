import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { AdminTrafficController } from './admin-traffic.controller.js';
import { TrafficMiddleware } from './traffic.middleware.js';
import { TrafficService } from './traffic.service.js';

/**
 * Anti-DDoS v1: the traffic middleware runs for every /api route —
 * bans reject immediately, everything else is counted (and can trigger
 * the auto-ban). The admin endpoints expose the snapshot, the ban list
 * and the thresholds to the «Состояние» tab.
 */
@Module({
  controllers: [AdminTrafficController],
  providers: [TrafficService],
  exports: [TrafficService],
})
export class TrafficModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TrafficMiddleware).forRoutes('{*splat}');
  }
}
