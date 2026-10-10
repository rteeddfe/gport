import { Module } from '@nestjs/common';
import {
  AdminProductKeysController,
  AdminProductsController,
} from './admin-products.controller.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

@Module({
  controllers: [
    ProductsController,
    AdminProductsController,
    AdminProductKeysController,
  ],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
