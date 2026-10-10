"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  analyticsSettingsSchema,
  type AnalyticsSettingsValues,
} from "@/schemas/site-settings.schema";
import { useUpdateSettings } from "../hooks/use-site-settings";
import type { SiteSettings } from "@/types/api";

interface AnalyticsSettingsFormProps {
  settings: SiteSettings;
}

/** Admin «Аналитика» tab: Yandex Metrika counter + Webvisor and the
 * Yandex Webmaster verification meta tag. */
export function AnalyticsSettingsForm({ settings }: AnalyticsSettingsFormProps) {
  const update = useUpdateSettings();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const form = useForm<AnalyticsSettingsValues>({
    resolver: zodResolver(analyticsSettingsSchema),
    defaultValues: {
      metrikaCounterId: settings.metrikaCounterId,
      metrikaWebvisor: settings.metrikaWebvisor,
      yandexVerification: settings.yandexVerification,
    },
  });

  async function onSubmit(values: AnalyticsSettingsValues) {
    setSavedAt(null);
    try {
      await update.mutateAsync({
        // The PUT replaces the whole row — carry the untouched fields.
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
        socials: settings.socials,
        headerMenu: settings.headerMenu,
        footerMenus: settings.footerMenus,
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
        metrikaCounterId: values.metrikaCounterId,
        metrikaWebvisor: values.metrikaWebvisor,
        yandexVerification: values.yandexVerification,
      });
      setSavedAt(new Date().toLocaleTimeString("ru-RU"));
    } catch {
      // Same as the other settings forms — errors render below.
    }
  }

  const errorMessage =
    update.error instanceof Error ? update.error.message : null;
  const errors = form.formState.errors;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Яндекс Метрика</h2>
        <div className="space-y-1.5">
          <Label htmlFor="metrikaCounterId">Номер счётчика</Label>
          <Input
            id="metrikaCounterId"
            inputMode="numeric"
            placeholder="12345678"
            {...form.register("metrikaCounterId")}
          />
          {errors.metrikaCounterId ? (
            <p className="text-destructive text-xs">
              {errors.metrikaCounterId.message}
            </p>
          ) : null}
          <p className="text-muted-foreground text-xs">
            Цифровой номер из настроек счётчика Яндекс Метрики. Пусто — счётчик
            не подключается. Скрипт выводится на всех страницах сайта.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            id="metrikaWebvisor"
            className="mt-0.5"
            checked={form.watch("metrikaWebvisor")}
            onCheckedChange={(checked) =>
              form.setValue("metrikaWebvisor", checked === true)
            }
          />
          <div className="space-y-1">
            <Label htmlFor="metrikaWebvisor">Вебвизор</Label>
            <p className="text-muted-foreground text-xs">
              Запись действий посетителей (движения мыши, прокрутка, клики) для
              просмотра сессий в Яндекс Метрике.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Яндекс Вебмастер</h2>
        <div className="space-y-1.5">
          <Label htmlFor="yandexVerification">Метатег подтверждения</Label>
          <Input
            id="yandexVerification"
            placeholder={'<meta name="yandex-verification" content="…" />'}
            {...form.register("yandexVerification")}
          />
          {errors.yandexVerification ? (
            <p className="text-destructive text-xs">
              {errors.yandexVerification.message}
            </p>
          ) : null}
          <p className="text-muted-foreground text-xs">
            Вставьте метатег из Яндекс Вебмастера целиком или только код из
            атрибута content. Выводится в head всех страниц.
          </p>
        </div>
      </section>

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
