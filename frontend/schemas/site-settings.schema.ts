import { z } from "zod";

/** Mirrors the backend UpdateSiteSettingsDto — the admin form submits the
 * full object (PUT /admin/settings). The backend re-validates everything.
 * The store ships blank: every text field may be empty. */

export const socialLinkSchema = z.object({
  label: z.string().trim().max(50),
  url: z.string().trim().max(300),
  iconUrl: z.string().trim().max(300).optional(),
});

/** Preset icon names for the header menu constructor (lucide kebab-case);
 * must match HEADER_ICON_NAMES in the backend DTO. */
export const HEADER_ICONS = [
  "layout-grid",
  "wallet",
  "percent",
  "newspaper",
  "home",
  "gamepad-2",
  "gift",
  "star",
  "zap",
  "shopping-cart",
  "heart",
  "phone",
  "mail",
  "globe",
  "circle",
] as const;

export type HeaderIcon = (typeof HEADER_ICONS)[number];

export const headerMenuItemSchema = z.object({
  icon: z.enum(HEADER_ICONS),
  label: z.string().trim().max(50, "Не длиннее 50 символов"),
  href: z.string().trim().max(300, "Не длиннее 300 символов"),
});

export const footerMenuItemSchema = z.object({
  label: z.string().trim().max(100, "Не длиннее 100 символов"),
  href: z.string().trim().max(300, "Не длиннее 300 символов"),
});

export const footerMenuSchema = z.object({
  title: z.string().trim().max(100, "Не длиннее 100 символов"),
  items: z.array(footerMenuItemSchema).max(15, "Не больше 15 ссылок"),
});

export const generalSettingsSchema = z.object({
  siteName: z.string().trim().max(100),
  descriptor: z.string().trim().max(200),
  descriptorFooter: z.string().trim().max(500),
  supportEmail: z
    .string()
    .trim()
    .max(200)
    .regex(/^(?:|[^\s@]+@[^\s@]+\.[^\s@]+)$/, "Введите корректный email или оставьте поле пустым"),
  /** Legal entity requisites (footer block, documents, payment-provider
   * moderation); every field optional. */
  legalName: z.string().trim().max(200),
  legalInn: z
    .string()
    .trim()
    .max(30)
    .regex(/^(?:\d{10}|\d{12})?$/, "ИНН — 10 или 12 цифр, либо пусто"),
  legalOgrn: z
    .string()
    .trim()
    .max(30)
    .regex(/^(?:\d{13}|\d{15})?$/, "ОГРН — 13 цифр (ОГРНИП — 15), либо пусто"),
  legalAddress: z.string().trim().max(300),
  legalPhone: z.string().trim().max(30),
  logoUrl: z.string().trim().max(500),
  socials: z.array(socialLinkSchema).max(10, "Не больше 10 соцсетей"),
  headerMenu: z.array(headerMenuItemSchema).max(8, "Не больше 8 пунктов"),
  footerMenus: z.array(footerMenuSchema).max(4, "Не больше 4 колонок"),
});

export const seoSettingsSchema = z.object({
  seoTitle: z.string().trim().max(200),
  seoDescription: z.string().trim().max(500),
  ogImageUrl: z.string().trim().max(500).optional().nullable(),
  faviconUrl: z.string().trim().max(500),
  robotsTxt: z.string().max(10_000, "Не длиннее 10 000 символов"),
  manifestName: z.string().trim().max(100),
  manifestShortName: z.string().trim().max(50),
  manifestThemeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Формат #RRGGBB"),
  manifestBackgroundColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Формат #RRGGBB"),
  manifestIcon192Url: z.string().trim().max(500),
  manifestIcon512Url: z.string().trim().max(500),
});

export const analyticsSettingsSchema = z.object({
  metrikaCounterId: z
    .string()
    .trim()
    .regex(/^(\d{4,14})?$/, "Только цифры, 4–14 знаков"),
  metrikaWebvisor: z.boolean(),
  yandexVerification: z
    .string()
    .trim()
    .max(300, "Не длиннее 300 символов"),
});

export type GeneralSettingsInput = z.input<typeof generalSettingsSchema>;
export type GeneralSettingsValues = z.output<typeof generalSettingsSchema>;
export type SeoSettingsValues = z.infer<typeof seoSettingsSchema>;
export type AnalyticsSettingsValues = z.infer<typeof analyticsSettingsSchema>;
