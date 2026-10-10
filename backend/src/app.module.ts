import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RateLimitGuard } from './common/guards/rate-limit.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import configuration from './config/configuration.js';
import { envValidationSchema } from './config/env.validation.js';
import { PrismaModule } from './database/prisma.module.js';
import { FaqModule } from './faq/faq.module.js';
import { FilesModule } from './files/files.module.js';
import { HealthModule } from './health/health.module.js';
import { HomeContentModule } from './home-content/home-content.module.js';
import { IntegrationsModule } from './integrations/integrations.module.js';
import { ListValuesModule } from './list-values/list-values.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { PoliciesModule } from './policies/policies.module.js';
import { PostsModule } from './posts/posts.module.js';
import { ProductsModule } from './products/products.module.js';
import { PromoCodesModule } from './promo-codes/promo-codes.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { SearchModule } from './search/search.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { SupportModule } from './support/support.module.js';
import { TrafficModule } from './traffic/traffic.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    AuditModule,
    HealthModule,
    UsersModule,
    AuthModule,
    ProductsModule,
    CategoriesModule,
    SearchModule,
    PromoCodesModule,
    SettingsModule,
    PoliciesModule,
    PostsModule,
    ReviewsModule,
    FaqModule,
    HomeContentModule,
    ListValuesModule,
    FilesModule,
    OrdersModule,
    PaymentsModule,
    SupportModule,
    TrafficModule,
    IntegrationsModule,
  ],
  providers: [
    // Global per-IP rate limit (the first DDoS/brute-force dam). Sensitive
    // endpoints tighten it with @RateLimit — see auth/orders/payments/search.
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}