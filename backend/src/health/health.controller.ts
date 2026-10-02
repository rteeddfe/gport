import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator.js';
import { HealthService, type HealthCheckResult } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /** Liveness/readiness probe for local dev and deployments. */
  @Public()
  @Get()
  check(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }
}
