import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator.js';
import { FindProductsDto } from './dto/find-products.dto.js';
import {
  ProductsService,
  type PaginatedProducts,
  type ProductDetail,
} from './products.service.js';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  findMany(@Query() query: FindProductsDto): Promise<PaginatedProducts> {
    return this.productsService.findMany(query);
  }

  @Public()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string): Promise<ProductDetail> {
    return this.productsService.findBySlug(slug);
  }
}
