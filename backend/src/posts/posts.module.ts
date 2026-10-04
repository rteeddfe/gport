import { Module } from '@nestjs/common';
import { AdminPostsController } from './admin-posts.controller.js';
import { PostsController } from './posts.controller.js';
import { PostsService } from './posts.service.js';

@Module({
  controllers: [PostsController, AdminPostsController],
  providers: [PostsService],
})
export class PostsModule {}
