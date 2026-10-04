import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SocialLinkDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  label: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  iconUrl?: string;
}

/** Full-object PUT: the admin form always submits every field. */
export class UpdateSiteSettingsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  siteName: string;

  @IsEmail()
  @MaxLength(200)
  supportEmail: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  logoUrl: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socials: SocialLinkDto[];

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  seoTitle: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  seoDescription: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ogImageUrl?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  faviconUrl: string;

  @IsString()
  @MaxLength(10_000)
  robotsTxt: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  manifestName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  manifestShortName: string;

  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'themeColor must be #RRGGBB' })
  manifestThemeColor: string;

  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'backgroundColor must be #RRGGBB' })
  manifestBackgroundColor: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  manifestIcon192Url: string;

  @IsString()
  @MinLength(1)
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
