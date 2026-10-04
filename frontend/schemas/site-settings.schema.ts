import { z } from "zod";

/** Mirrors the backend UpdateSiteSettingsDto — the admin form submits the
 * full object (PUT /admin/settings). The backend re-validates everything. */

export const socialLinkSchema = z.object({
  label: z.string().trim().min(1, "Укажите название").max(50),
  url: z.string().trim().min(1, "Укажите ссылку").max(300),
  iconUrl: z.string().trim().max(300).optional(),
});

export const generalSettingsSchema = z.object({
  siteName: z.string().trim().min(1, "Укажите название").max(100),
  supportEmail: z.email("Введите корректный email"),
  logoUrl: z.string().trim().min(1, "Загрузите логотип").max(500),
  socials: z.array(socialLinkSchema),
});

export const seoSettingsSchema = z.object({
  seoTitle: z.string().trim().min(1, "Укажите title").max(200),
  seoDescription: z.string().trim().min(1, "Укажите description").max(500),
  ogImageUrl: z.string().trim().max(500).optional().nullable(),
  faviconUrl: z.string().trim().min(1, "Укажите фавиконку").max(500),
  robotsTxt: z.string().max(10_000, "Не длиннее 10 000 символов"),
  manifestName: z.string().trim().min(1, "Укажите имя").max(100),
  manifestShortName: z.string().trim().min(1, "Укажите короткое имя").max(50),
  manifestThemeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Формат #RRGGBB"),
  manifestBackgroundColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Формат #RRGGBB"),
  manifestIcon192Url: z.string().trim().min(1, "Нужна иконка 192×192").max(500),
  manifestIcon512Url: z.string().trim().min(1, "Нужна иконка 512×512").max(500),
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

export type SocialLinkValues = z.infer<typeof socialLinkSchema>;
export type GeneralSettingsValues = z.infer<typeof generalSettingsSchema>;
export type SeoSettingsValues = z.infer<typeof seoSettingsSchema>;
export type AnalyticsSettingsValues = z.infer<typeof analyticsSettingsSchema>;
