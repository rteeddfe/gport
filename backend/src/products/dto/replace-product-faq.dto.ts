import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ProductFaqItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  question: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  answer: string;
}

/** Bulk replace of the product's FAQ (admin product form sends the whole
 * list; display order = list order). */
export class ReplaceProductFaqDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ProductFaqItemDto)
  faq: ProductFaqItemDto[];
}
