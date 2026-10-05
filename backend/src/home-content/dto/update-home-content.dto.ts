import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** One admin-managed card of the home top-up wall: an uploaded image plus
 * the link the whole tile points at. */
export class WallCardDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  imageUrl: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  href: string;
}

/** A home-block reference to a service top-up product. iconUrl overrides
 * the product cover art when the admin uploaded a dedicated mini logo. */
export class ServiceRefDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  iconUrl?: string | null;
}

/** Full-object PUT: the admin form always submits every field at once. */
export class UpdateHomeContentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  kicker: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  titleAccent: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  ctaLabel: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  ctaHref: string;

  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(200, { each: true })
  tiles: string[];

  /** Empty array = the wall renders the built-in service tiles. */
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => WallCardDto)
  wallCards: WallCardDto[];

  /** Empty array = the hero cylinder keeps its built-in placeholder covers. */
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => WallCardDto)
  carouselCards: WallCardDto[];

  /** Services of the home top-up FORM (block 2): picked from the
   * top-up products; empty = the block hides the form. */
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => ServiceRefDto)
  topupServices: ServiceRefDto[];

  /** Services of the home SERVICE WALL (block 3): up to 7 picked
   * top-up products rendered as tiles around the CTA. */
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => ServiceRefDto)
  serviceCards: ServiceRefDto[];
}
