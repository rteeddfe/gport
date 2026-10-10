import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import type { UpdateSiteSettingsDto } from './dto/update-site-settings.dto.js';

/** Shape returned to the public frontend (and consumed by the admin form). */
export interface SocialLink {
  label: string;
  url: string;
  iconUrl?: string;
}

export type SiteSettingsView = Omit<
  Prisma.SiteSettingsGetPayload<object>,
  'socials'
> & { socials: SocialLink[] };

const SETTINGS_ID = 1;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Self-healing read: the singleton row is created on first access so the
   * storefront renders even before the seed has run. */
  async find(): Promise<SiteSettingsView> {
    const row =
      (await this.prisma.siteSettings.findUnique({
        where: { id: SETTINGS_ID },
      })) ??
      (await this.prisma.siteSettings.create({ data: { id: SETTINGS_ID } }));
    const { socials, ...rest } = row;
    return { ...rest, socials: (socials as unknown as SocialLink[]) ?? [] };
  }

  async update(dto: UpdateSiteSettingsDto): Promise<SiteSettingsView> {
    const data = {
      siteName: dto.siteName,
      descriptor: dto.descriptor,
      descriptorFooter: dto.descriptorFooter,
      supportEmail: dto.supportEmail,
      legalName: dto.legalName,
      legalInn: dto.legalInn,
      legalOgrn: dto.legalOgrn,
      legalAddress: dto.legalAddress,
      legalPhone: dto.legalPhone,
      logoUrl: dto.logoUrl,
      socials: dto.socials as unknown as Prisma.InputJsonValue,
      headerMenu: dto.headerMenu as unknown as Prisma.InputJsonValue,
      footerMenus: dto.footerMenus as unknown as Prisma.InputJsonValue,
      seoTitle: dto.seoTitle,
      seoDescription: dto.seoDescription,
      ogImageUrl: dto.ogImageUrl ?? null,
      faviconUrl: dto.faviconUrl,
      robotsTxt: dto.robotsTxt,
      manifestName: dto.manifestName,
      manifestShortName: dto.manifestShortName,
      manifestThemeColor: dto.manifestThemeColor,
      manifestBackgroundColor: dto.manifestBackgroundColor,
      manifestIcon192Url: dto.manifestIcon192Url,
      manifestIcon512Url: dto.manifestIcon512Url,
      metrikaCounterId: dto.metrikaCounterId,
      metrikaWebvisor: dto.metrikaWebvisor,
      yandexVerification: dto.yandexVerification,
    };
    const row = await this.prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      update: data,
      create: { id: SETTINGS_ID, ...data },
    });
    const { socials, ...rest } = row;
    return { ...rest, socials: (socials as unknown as SocialLink[]) ?? [] };
  }
}
