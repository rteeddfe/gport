import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ProductStatus } from '../../generated/prisma/client.js';
import { FindProductsDto } from './find-products.dto.js';

/** Admin catalog list: everything the public filter has plus status/categoryId. */
export class AdminFindProductsDto extends FindProductsDto {
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
