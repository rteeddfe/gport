import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
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

/** One stat card of the trust block: a badge label, a bold gradient
 * number (prefix + value) and the line under it. */
export class StatCardDto {
  @IsString()
  @MaxLength(100)
  label: string;

  @IsString()
  @MaxLength(50)
  prefix: string;

  @IsString()
  @MaxLength(50)
  value: string;

  @IsString()
  @MaxLength(100)
  description: string;
}

/** One community card of the trust block: brand picks the built-in
 * icon and tile color, the rest is free text plus the join link. */
export class CommunityCardDto {
  @IsString()
  @IsIn(['telegram', 'vk'])
  brand: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(300)
  description: string;

  @IsString()
  @MaxLength(50)
  usersCount: string;

  @IsString()
  @MaxLength(100)
  usersLabel: string;

  @IsString()
  @MaxLength(300)
  url: string;
}

/** Full-object PUT: the admin form always submits every field at once. */
export class UpdateHomeContentDto {
  /** The store ships blank: every text may be empty — empty CTAs and
   * tiles simply do not render on the storefront. */
  @IsString()
  @MaxLength(100)
  kicker: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(200)
  titleAccent: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string;

  /** Primary CTA (filled style, wallet icon). Empty = no button. */
  @IsString()
  @MaxLength(100)
  ctaPrimaryLabel: string;

  @IsString()
  @MaxLength(300)
  ctaPrimaryHref: string;

  /** Secondary CTA (outline style, gamepad icon). Empty = no button. */
  @IsString()
  @MaxLength(100)
  ctaLabel: string;

  @IsString()
  @MaxLength(300)
  ctaHref: string;

  /** Up to four advantage tile texts; empty rows are skipped. */
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
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

  /** Trust block before the news: up to 2 stat cards; empty rows drop
   * out at render, an empty array hides the stat cards. */
  @IsArray()
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => StatCardDto)
  statCards: StatCardDto[];

  /** Trust block social badge heading; empty = the community card hides. */
  @IsString()
  @MaxLength(100)
  communityLabel: string;

  /** Community cards (Telegram / VK); empty array = the block hides. */
  @IsArray()
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => CommunityCardDto)
  communityCards: CommunityCardDto[];
}
