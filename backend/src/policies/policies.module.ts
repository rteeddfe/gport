import { Module } from '@nestjs/common';
import { AdminPoliciesController, PoliciesController } from './policies.controller.js';
import { PoliciesService } from './policies.service.js';

@Module({
  controllers: [PoliciesController, AdminPoliciesController],
  providers: [PoliciesService],
})
export class PoliciesModule {}
