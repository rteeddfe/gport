import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { CartModule } from './cart/cart.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import configuration from './config/configuration.js';
import { envValidationSchema } from './config/env.validation.js';
import { PrismaModule } from './database/prisma.module.js';
import { FaqModule } from './faq/faq.module.js';
import { FilesModule } from './files/files.module.js';
import { HealthModule } from './health/health.module.js';
import { HomeContentModule } from './home-content/home-content.module.js';
import { PoliciesModule } from './policies/policies.module.js';
import { PostsModule } from './posts/posts.module.js';
import { ProductsModule } from './products/products.module.js';
import { PromoCodesModule } from './promo-codes/promo-codes.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { SearchModule } from './search/search.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    ProductsModule,
    CategoriesModule,
    SearchModule,
    CartModule,
    PromoCodesModule,
    SettingsModule,
    PoliciesModule,
    PostsModule,
    ReviewsModule,
    FaqModule,
    HomeContentModule,
    FilesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}