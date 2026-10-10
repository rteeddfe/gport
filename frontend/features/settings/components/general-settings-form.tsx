"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm, type UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  generalSettingsSchema,
  HEADER_ICONS,
  type GeneralSettingsInput,
  type GeneralSettingsValues,
  type HeaderIcon,
} from "@/schemas/site-settings.schema";
import type { SiteSettings } from "@/types/api";
import { ImageUpload } from "./image-upload";
import { useUpdateSettings } from "../hooks/use-site-settings";

/** The form API type shared with the nested footer-column editor: input
 * values (RHF fields) + the schema's transformed output on submit. */
type GeneralSettingsFormApi = UseFormReturn<
  GeneralSettingsInput,
  unknown,
  GeneralSettingsValues
>;

/** Human labels of the preset header-menu icons. */
const ICON_LABELS: Record<HeaderIcon, string> = {
  "layout-grid": "Сетка (каталог)",
  wallet: "Кошелёк",
  percent: "Процент (акции)",
  newspaper: "Газета (блог)",
  home: "Дом",
  "gamepad-2": "Геймпад",
  gift: "Подарок",
  star: "Звезда",
  zap: "Молния",
  "shopping-cart": "Корзина",
  heart: "Сердце",
  phone: "Телефон",
  mail: "Конверт",
  globe: "Глобус",
  circle: "Точка",
};

interface GeneralSettingsFormProps {
  settings: SiteSettings;
}

/** «Основные настройки» tab: name, descriptor, support email, logo
 * (upload), socials, the header-menu constructor (icon + text + link)
 * and the footer menu columns (title + text links). Everything is
 * optional — the store ships blank and fills from here. */
export function GeneralSettingsForm({ settings }: GeneralSettingsFormProps) {
  const update = useUpdateSettings();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const form = useForm<GeneralSettingsInput, unknown, GeneralSettingsValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      siteName: settings.siteName,
      descriptor: settings.descriptor,
      descriptorFooter: settings.descriptorFooter,
      supportEmail: settings.supportEmail,
      legalName: settings.legalName,
      legalInn: settings.legalInn,
      legalOgrn: settings.legalOgrn,
      legalAddress: settings.legalAddress,
      legalPhone: settings.legalPhone,
      logoUrl: settings.logoUrl,
      socials: settings.socials.map((link) => ({
        label: link.label,
        url: link.url,
        iconUrl: link.iconUrl ?? "",
      })),
      // The API stores the icon as a validated string; unknown names fall
      // back to the neutral circle at render time.
      headerMenu: settings.headerMenu.map((item) => ({
        icon: item.icon as HeaderIcon,
        label: item.label,
        href: item.href,
      })),
      footerMenus: settings.footerMenus.map((menu) => ({
        title: menu.title,
        items: menu.items.map((item) => ({
          label: item.label,
          href: item.href,
        })),
      })),
    },
  });
  const errors = form.formState.errors;
  const socials = useFieldArray({ control: form.control, name: "socials" });
  const headerMenu = useFieldArray({ control: form.control, name: "headerMenu" });
  const footerMenus = useFieldArray({ control: form.control, name: "footerMenus" });

  async function onSubmit(values: GeneralSettingsValues) {
    setSavedAt(null);
    try {
      await update.mutateAsync({
        // The PUT replaces the whole row — carry the untouched SEO fields.
        siteName: values.siteName,
        descriptor: values.descriptor,
        descriptorFooter: values.descriptorFooter,
        supportEmail: values.supportEmail,
        legalName: values.legalName,
        legalInn: values.legalInn,
        legalOgrn: values.legalOgrn,
        legalAddress: values.legalAddress,
        legalPhone: values.legalPhone,
        logoUrl: values.logoUrl,
        socials: values.socials.map((link) => ({
          label: link.label,
          url: link.url,
          ...(link.iconUrl ? { iconUrl: link.iconUrl } : {}),
        })),
        headerMenu: values.headerMenu.map((item) => ({
          icon: item.icon,
          label: item.label,
          href: item.href,
        })),
        footerMenus: values.footerMenus.map((menu) => ({
          title: menu.title,
          items: menu.items.map((item) => ({
            label: item.label,
            href: item.href,
          })),
        })),
        seoTitle: settings.seoTitle,
        seoDescription: settings.seoDescription,
        ogImageUrl: settings.ogImageUrl,
        faviconUrl: settings.faviconUrl,
        robotsTxt: settings.robotsTxt,
        manifestName: settings.manifestName,
        manifestShortName: settings.manifestShortName,
        manifestThemeColor: settings.manifestThemeColor,
        manifestBackgroundColor: settings.manifestBackgroundColor,
        manifestIcon192Url: settings.manifestIcon192Url,
        manifestIcon512Url: settings.manifestIcon512Url,
        metrikaCounterId: settings.metrikaCounterId,
        metrikaWebvisor: settings.metrikaWebvisor,
        yandexVerification: settings.yandexVerification,
      });
      setSavedAt(new Date().toLocaleTimeString("ru-RU"));
    } catch {
      // The error surfaces below via update.isError + message extraction.
    }
  }

  const errorMessage =
    update.error instanceof Error ? update.error.message : null;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="siteName">Название сайта</Label>
          <Input id="siteName" {...form.register("siteName")} />
          {errors.siteName ? (
            <p className="text-destructive text-xs">{errors.siteName.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="descriptor">Дескриптор в шапке (у логотипа)</Label>
          <Input
            id="descriptor"
            placeholder="магазин цифровых товаров"
            {...form.register("descriptor")}
          />
          <p className="text-muted-foreground text-xs">
            Короткая подпись рядом с логотипом. Пусто — не выводится.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="supportEmail">Почта поддержки</Label>
          <Input id="supportEmail" type="email" {...form.register("supportEmail")} />
          {errors.supportEmail ? (
            <p className="text-destructive text-xs">
              {errors.supportEmail.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="descriptorFooter">Дескриптор в футере</Label>
        <Input
          id="descriptorFooter"
          placeholder="Интернет-магазин цифровых игровых товаров. Моментальная доставка, честные цены."
          {...form.register("descriptorFooter")}
        />
        <p className="text-muted-foreground text-xs">
          Абзац под логотипом в подвале. Пусто — не выводится.
        </p>
      </div>

      <ImageUpload
        label="Логотип"
        value={form.watch("logoUrl")}
        onChange={(url) => form.setValue("logoUrl", url)}
        hint="PNG, SVG или WebP. Пусто — логотип нигде не выводится."
      />
      {errors.logoUrl ? (
        <p className="text-destructive text-xs">{errors.logoUrl.message}</p>
      ) : null}

      <section className="border-border space-y-4 rounded-2xl border p-5">
        <div>
          <p className="text-sm font-medium">Реквизиты компании</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Отображаются в подвале сайта и подставляются в юридические документы
            (оферта, политика конфиденциальности, возвраты). Нужны для модерации
            платёжных систем. Все поля необязательны, но для приёма реальных
            платежей должны быть заполнены.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="legalName">Наименование (ИП / ООО)</Label>
            <Input id="legalName" placeholder="ИП Иванов Иван Иванович" {...form.register("legalName")} />
            {errors.legalName ? (
              <p className="text-destructive text-xs">{errors.legalName.message}</p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="legalInn">ИНН</Label>
              <Input id="legalInn" inputMode="numeric" placeholder="10 или 12 цифр" {...form.register("legalInn")} />
              {errors.legalInn ? (
                <p className="text-destructive text-xs">{errors.legalInn.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="legalOgrn">ОГРН / ОГРНИП</Label>
              <Input id="legalOgrn" inputMode="numeric" placeholder="13 или 15 цифр" {...form.register("legalOgrn")} />
              {errors.legalOgrn ? (
                <p className="text-destructive text-xs">{errors.legalOgrn.message}</p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="legalAddress">Юридический адрес</Label>
            <Input id="legalAddress" placeholder="123056, г. Москва, ул. …, д. …, офис …" {...form.register("legalAddress")} />
            {errors.legalAddress ? (
              <p className="text-destructive text-xs">{errors.legalAddress.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="legalPhone">Телефон</Label>
            <Input id="legalPhone" type="tel" placeholder="+7 (900) 000-00-00" {...form.register("legalPhone")} />
            {errors.legalPhone ? (
              <p className="text-destructive text-xs">{errors.legalPhone.message}</p>
            ) : null}
          </div>
        </div>
      </section>

      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Социальные сети</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              socials.append({ label: "", url: "", iconUrl: "" })
            }
          >
            <Plus className="size-4" aria-hidden />
            Добавить
          </Button>
        </div>
        <div className="mt-3 space-y-3">
          {socials.fields.map((field, index) => (
            <div
              key={field.id}
              className="border-border bg-surface grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end"
            >
              <div className="space-y-1.5">
                <Label htmlFor={`social-label-${index}`}>Название</Label>
                <Input
                  id={`social-label-${index}`}
                  placeholder="Telegram"
                  {...form.register(`socials.${index}.label`)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`social-url-${index}`}>Ссылка</Label>
                <Input
                  id={`social-url-${index}`}
                  placeholder="https://t.me/shop"
                  {...form.register(`socials.${index}.url`)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                aria-label="Удалить соцсеть"
                onClick={() => socials.remove(index)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
          {socials.fields.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Соцсети не заданы — футер покажет пустой блок.
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Меню в шапке</p>
            <p className="text-muted-foreground text-xs">
              Иконка + текст + ссылка. Пусто — навигация не выводится.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={headerMenu.fields.length >= 8}
            onClick={() =>
              headerMenu.append({ icon: "circle", label: "", href: "" })
            }
          >
            <Plus className="size-4" aria-hidden />
            Добавить пункт
          </Button>
        </div>
        <div className="mt-3 space-y-3">
          {headerMenu.fields.map((field, index) => (
            <div
              key={field.id}
              className="border-border bg-surface grid gap-3 rounded-xl border p-3 sm:grid-cols-[13rem_1fr_1fr_auto] sm:items-end"
            >
              <div className="space-y-1.5">
                <Label htmlFor={`nav-icon-${index}`}>Иконка</Label>
                <Select
                  value={form.watch(`headerMenu.${index}.icon`)}
                  onValueChange={(value) =>
                    form.setValue(`headerMenu.${index}.icon`, value as HeaderIcon)
                  }
                >
                  <SelectTrigger id={`nav-icon-${index}`}>
                    <SelectValue placeholder="Иконка" />
                  </SelectTrigger>
                  <SelectContent>
                    {HEADER_ICONS.map((icon) => (
                      <SelectItem key={icon} value={icon}>
                        {ICON_LABELS[icon]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`nav-label-${index}`}>Текст</Label>
                <Input
                  id={`nav-label-${index}`}
                  placeholder="Каталог"
                  {...form.register(`headerMenu.${index}.label`)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`nav-href-${index}`}>Ссылка</Label>
                <Input
                  id={`nav-href-${index}`}
                  placeholder="/products"
                  {...form.register(`headerMenu.${index}.href`)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                aria-label="Удалить пункт меню"
                onClick={() => headerMenu.remove(index)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
          {headerMenu.fields.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Меню пустое — навигация в шапке скрыта.
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Меню в футере</p>
            <p className="text-muted-foreground text-xs">
              Колонки с заголовком и ссылками (текст + ссылка). Ссылки на
              юридические страницы добавляйте сами — видны только созданные
              в разделе «Политики».
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={footerMenus.fields.length >= 4}
            onClick={() => footerMenus.append({ title: "", items: [] })}
          >
            <Plus className="size-4" aria-hidden />
            Добавить колонку
          </Button>
        </div>
        <div className="mt-3 space-y-4">
          {footerMenus.fields.map((menuField, menuIndex) => (
            <FooterMenuEditor
              key={menuField.id}
              form={form}
              menuIndex={menuIndex}
              onRemove={() => footerMenus.remove(menuIndex)}
            />
          ))}
          {footerMenus.fields.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Колонки не заданы — футер покажет только бренд и документы.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={update.isPending} className="gap-2">
          {update.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          Сохранить
        </Button>
        {savedAt ? (
          <p className="text-muted-foreground text-xs">
            Сохранено в {savedAt}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="text-destructive text-xs">{errorMessage}</p>
        ) : null}
      </div>
    </form>
  );
}

/** One footer column editor: title + its label/href rows. Nested field
 * arrays need their own component (each owns a useFieldArray hook). */
function FooterMenuEditor({
  form,
  menuIndex,
  onRemove,
}: {
  form: GeneralSettingsFormApi;
  menuIndex: number;
  onRemove: () => void;
}) {
  const items = useFieldArray({
    control: form.control,
    name: `footerMenus.${menuIndex}.items`,
  });
  const errors = form.formState.errors;

  return (
    <div className="border-border bg-surface rounded-xl border p-4">
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor={`footer-menu-title-${menuIndex}`}>Заголовок колонки</Label>
          <Input
            id={`footer-menu-title-${menuIndex}`}
            placeholder="Покупателям"
            {...form.register(`footerMenus.${menuIndex}.title`)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => items.append({ label: "", href: "" })}
        >
          <Plus className="size-4" aria-hidden />
          Ссылка
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          aria-label={`Удалить колонку ${menuIndex + 1}`}
          onClick={onRemove}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>
      <div className="mt-3 space-y-2">
        {items.fields.map((itemField, itemIndex) => (
          <div
            key={itemField.id}
            className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto] sm:items-center"
          >
            <Input
              placeholder="Текст"
              aria-label="Текст ссылки"
              {...form.register(
                `footerMenus.${menuIndex}.items.${itemIndex}.label`,
              )}
            />
            <Input
              placeholder="/policies/offer"
              aria-label="Ссылка"
              {...form.register(
                `footerMenus.${menuIndex}.items.${itemIndex}.href`,
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              aria-label="Удалить ссылку"
              onClick={() => items.remove(itemIndex)}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
        {items.fields.length === 0 ? (
          <p className="text-muted-foreground text-xs">Ссылок пока нет.</p>
        ) : null}
        {errors.footerMenus?.[menuIndex]?.items?.message ? (
          <p className="text-destructive text-xs">
            {errors.footerMenus[menuIndex]?.items?.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
