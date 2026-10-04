import { Module } from '@nestjs/common';
import {
  AdminHomeContentController,
  HomeContentController,
} from './home-content.controller.js';
import { HomeContentService } from './home-content.service.js';

@Module({
  controllers: [HomeContentController, AdminHomeContentController],
  providers: [HomeContentService],
})
export class HomeContentModule {}
