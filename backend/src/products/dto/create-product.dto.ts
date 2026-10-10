import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  AccountFieldKind,
  CreditingMode,
  ProductKind,
  ProductStatus,
} from '../../generated/prisma/client.js';

/** One purchasable nominal of a TOPUP_NOMINAL product («60 UC»): its
 * label plus the price the buyer pays. */
export class ProductVariantDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  value?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string | null;

  @IsInt()
  @Min(0)
  priceCents: number;

  /** Discount anchor; null clears it. */
  @IsOptional()
  @IsInt()
  @Min(0)
  oldPriceCents?: number | null;
}

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  instruction?: string;

  /** Catalog platform facet: steam | playstation | xbox | nintendo. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  platform?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  genre?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  images?: string[];

  @IsInt()
  @Min(0)
  priceCents: number;

  /** Discount anchor; null clears it. */
  @IsOptional()
  @IsInt()
  @Min(0)
  oldPriceCents?: number | null;

  /** Cashback returned to the buyer balance, percent 0..99. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  cashbackPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1990)
  @Max(2100)
  releaseYear?: number | null;

  /** Editorial rating 0..5 shown on the card. */
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(5)
  rating?: number | null;

  /** Console generations («PlayStation 5», «Nintendo Switch 2»…). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  consoles?: string[];

  /** Merch badges: "hit", "new" — picked from the category's badges. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  tags?: string[];

  /** Subscription service one-liner (catalog subtitle). */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  tagline?: string | null;

  /** Subscription group: gaming | ai | media | social. */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  group?: string | null;

  /** «Что входит» bullets of a subscription service. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  features?: string[];

  /** Folk search terms («пс плюс», «гпт») matched by catalog search. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(15)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  searchAliases?: string[];

  /** Game system requirements, fixed shape:
   * { minimum?, recommended?: { os, cpu, gpu, ram, storage } }. */
  @IsOptional()
  @IsObject()
  systemRequirements?: Record<string, unknown> | null;

  /** Available quantity (digital keys) in stock. */
  @IsInt()
  @Min(0)
  stock: number;


  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  /** Product kind: key/gift code, fixed nominals or an amount range. */
  @IsOptional()
  @IsEnum(ProductKind)
  kind?: ProductKind;

  /** TOPUP_AMOUNT only: the buyer-entered amount range (kopecks). */
  @IsOptional()
  @IsInt()
  @Min(0)
  minValue?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxValue?: number | null;

  /** Service commission on top of the credited amount, percent 0..50. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  commissionPercent?: number;

  /** Fulfillment: auto codes (key pool) or manual operator crediting. */
  @IsOptional()
  @IsEnum(CreditingMode)
  creditingMode?: CreditingMode;

  /** Checkout account field for top-ups (what the buyer must provide). */
  @IsOptional()
  @IsEnum(AccountFieldKind)
  accountFieldKind?: AccountFieldKind | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountFieldLabel?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  accountFieldHint?: string | null;

  /** Source-system id of an imported product (unique, idempotent import). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  externalId?: string | null;

  /** TOPUP_NOMINAL only: full replace of the nominal list on save. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @IsUUID()
  categoryId: string;
}
