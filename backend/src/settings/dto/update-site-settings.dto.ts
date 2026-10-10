import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** Preset icon names for the header menu constructor (lucide kebab-case);
 * the frontend maps each name to its component. */
export const HEADER_ICON_NAMES = [
  'layout-grid',
  'wallet',
  'percent',
  'newspaper',
  'home',
  'gamepad-2',
  'gift',
  'star',
  'zap',
  'shopping-cart',
  'heart',
  'phone',
  'mail',
  'globe',
  'circle',
] as const;

export class SocialLinkDto {
  @IsString()
  @MaxLength(50)
  label: string;

  @IsString()
  @MaxLength(300)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  iconUrl?: string;
}

/** One header-menu entry: a preset icon name, text and a link. */
export class HeaderMenuItemDto {
  @IsString()
  @IsIn(HEADER_ICON_NAMES)
  icon: string;

  @IsString()
  @MaxLength(50)
  label: string;

  @IsString()
  @MaxLength(300)
  href: string;
}

/** One footer-menu entry: { label, href }. */
export class FooterMenuItemDto {
  @IsString()
  @MaxLength(100)
  label: string;

  @IsString()
  @MaxLength(300)
  href: string;
}

/** One footer menu column: title + its links. */
export class FooterMenuDto {
  @IsString()
  @MaxLength(100)
  title: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FooterMenuItemDto)
  items: FooterMenuItemDto[];
}

/** Full-object PUT: the admin form always submits every field. The store
 * ships blank — every text field may be empty. */
export class UpdateSiteSettingsDto {
  @IsString()
  @MaxLength(100)
  siteName: string;

  /** Short line under/beside the logo («магазин цифровых товаров»). */
  @IsString()
  @MaxLength(200)
  descriptor: string;

  /** Footer brand paragraph (longer text under the logo column). */
  @IsString()
  @MaxLength(500)
  descriptorFooter: string;

  /** Empty allowed; a filled value must look like an email. */
  @IsString()
  @Matches(/^(?:|[^\s@]+@[^\s@]+\.[^\s@]+)$/, {
    message: 'supportEmail must be empty or a valid email',
  })
  @MaxLength(200)
  supportEmail: string;

  /** Legal entity requisites: the footer block, legal documents and
   * payment-provider moderation. Empty = the block is not rendered. */
  @IsString()
  @MaxLength(200)
  legalName: string;

  @IsString()
  @MaxLength(30)
  legalInn: string;

  @IsString()
  @MaxLength(30)
  legalOgrn: string;

  @IsString()
  @MaxLength(300)
  legalAddress: string;

  @IsString()
  @MaxLength(30)
  legalPhone: string;

  /** Empty string = no logo rendered anywhere. */
  @IsString()
  @MaxLength(500)
  logoUrl: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socials: SocialLinkDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HeaderMenuItemDto)
  headerMenu: HeaderMenuItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FooterMenuDto)
  footerMenus: FooterMenuDto[];

  @IsString()
  @MaxLength(200)
  seoTitle: string;

  @IsString()
  @MaxLength(500)
  seoDescription: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ogImageUrl?: string;

  @IsString()
  @MaxLength(500)
  faviconUrl: string;

  @IsString()
  @MaxLength(10_000)
  robotsTxt: string;

  @IsString()
  @MaxLength(100)
  manifestName: string;

  @IsString()
  @MaxLength(50)
  manifestShortName: string;

  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'themeColor must be #RRGGBB' })
  manifestThemeColor: string;

  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'backgroundColor must be #RRGGBB' })
  manifestBackgroundColor: string;

  @IsString()
  @MaxLength(500)
  manifestIcon192Url: string;

  @IsString()
  @MaxLength(500)
  manifestIcon512Url: string;

  @IsString()
  @Matches(/^(?:\d{4,14})?$/, {
    message: 'metrikaCounterId must be empty or 4-14 digits',
  })
  metrikaCounterId: string;

  @IsBoolean()
  metrikaWebvisor: boolean;

  @IsString()
  @MaxLength(300)
  yandexVerification: string;
}
