import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import { AdminFindProductsDto } from './dto/admin-find-products.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ReplaceProductFaqDto } from './dto/replace-product-faq.dto.js';
import { ReplaceProductKeysDto } from './dto/replace-product-keys.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import {
  PaginatedProducts,
  ProductsService,
  ProductWithCategory,
} from './products.service.js';

@ApiTags('admin/products')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@RequirePermissions('products')
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findMany(@Query() query: AdminFindProductsDto): Promise<PaginatedProducts> {
    return this.productsService.findManyAdmin(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProductWithCategory> {
    return this.productsService.findOne(id);
  }

  @Get(':id/faq')
  listFaq(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.listFaq(id);
  }

  @Put(':id/faq')
  @HttpCode(HttpStatus.OK)
  async replaceFaq(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceProductFaqDto,
  ): Promise<{ ok: true }> {
    await this.productsService.replaceFaq(id, dto.faq);
    return { ok: true };
  }

  @Post()
  create(@Body() dto: CreateProductDto): Promise<ProductWithCategory> {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductWithCategory> {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.productsService.remove(id);
  }
}

/** ProductKey pool — raw key values are the sellable goods themselves
 * (the same values the orders API hides behind SUPER_ADMIN), so this
 * boundary matches the order-view policy: SUPER_ADMIN only. A separate
 * controller (not per-handler metadata) keeps the guard semantics plain:
 * role check only, no ADMIN permission can reach these routes. */
@ApiTags('admin/products')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN)
@Controller('admin/products')
export class AdminProductKeysController {
  constructor(private readonly productsService: ProductsService) {}

  @Get(':id/keys')
  listKeys(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.listKeys(id);
  }

  @Put(':id/keys')
  @HttpCode(HttpStatus.OK)
  async replaceKeys(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceProductKeysDto,
  ): Promise<{ ok: true }> {
    await this.productsService.replaceKeys(id, dto.keys);
    return { ok: true };
  }
}
