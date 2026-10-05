"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  seoSettingsSchema,
  type SeoSettingsValues,
} from "@/schemas/site-settings.schema";
import { ImageUpload } from "./image-upload";
import { useUpdateSettings } from "../hooks/use-site-settings";
import type { SiteSettings } from "@/types/api";

interface SeoSettingsFormProps {
  settings: SiteSettings;
}

/** «Настройки SEO» tab: meta title/description, og:image, robots.txt,
 * PWA manifest fields and the favicon. */
export function SeoSettingsForm({ settings }: SeoSettingsFormProps) {
  const update = useUpdateSettings();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const form = useForm<SeoSettingsValues>({
    resolver: zodResolver(seoSettingsSchema),
    defaultValues: {
      seoTitle: settings.seoTitle,
      seoDescription: settings.seoDescription,
      ogImageUrl: settings.ogImageUrl ?? "",
      faviconUrl: settings.faviconUrl,
      robotsTxt: settings.robotsTxt,
      manifestName: settings.manifestName,
      manifestShortName: settings.manifestShortName,
      manifestThemeColor: settings.manifestThemeColor,
      manifestBackgroundColor: settings.manifestBackgroundColor,
      manifestIcon192Url: settings.manifestIcon192Url,
      manifestIcon512Url: settings.manifestIcon512Url,
    },
  });

  async function onSubmit(values: SeoSettingsValues) {
    setSavedAt(null);
    try {
      await update.mutateAsync({
        // Carry the untouched general fields — the PUT replaces the row.
        siteName: settings.siteName,
        supportEmail: settings.supportEmail,
        logoUrl: settings.logoUrl,
        socials: settings.socials,
        seoTitle: values.seoTitle,
        seoDescription: values.seoDescription,
        ogImageUrl: values.ogImageUrl || null,
        faviconUrl: values.faviconUrl,
        robotsTxt: values.robotsTxt,
        manifestName: values.manifestName,
        manifestShortName: values.manifestShortName,
        manifestThemeColor: values.manifestThemeColor,
        manifestBackgroundColor: values.manifestBackgroundColor,
        manifestIcon192Url: values.manifestIcon192Url,
        manifestIcon512Url: values.manifestIcon512Url,
        metrikaCounterId: settings.metrikaCounterId,
        metrikaWebvisor: settings.metrikaWebvisor,
        yandexVerification: settings.yandexVerification,
      });
      setSavedAt(new Date().toLocaleTimeString("ru-RU"));
    } catch {
      // Same as the general form — errors render below.
    }
  }

  const errorMessage =
    update.error instanceof Error ? update.error.message : null;
  const errors = form.formState.errors;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Мета-теги и соцсети</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="seoTitle">Title</Label>
            <Input id="seoTitle" {...form.register("seoTitle")} />
            {errors.seoTitle ? (
              <p className="text-destructive text-xs">{errors.seoTitle.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seoDescription">Description</Label>
            <Input id="seoDescription" {...form.register("seoDescription")} />
            {errors.seoDescription ? (
              <p className="text-destructive text-xs">
                {errors.seoDescription.message}
              </p>
            ) : null}
          </div>
        </div>
        <ImageUpload
          label="Картинка для соцсетей (og:image)"
          value={form.watch("ogImageUrl")}
          onChange={(url) => form.setValue("ogImageUrl", url)}
          hint="Рекомендуется 1200×630"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">robots.txt</h2>
        <Textarea
          rows={6}
          className="font-mono text-xs"
          aria-label="Содержимое robots.txt"
          {...form.register("robotsTxt")}
        />
        {errors.robotsTxt ? (
          <p className="text-destructive text-xs">{errors.robotsTxt.message}</p>
        ) : null}
        <p className="text-muted-foreground text-xs">
          Отдаётся по адресу /robots.txt в исходном виде.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Веб-приложение (манифест)</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="manifestName">Имя приложения</Label>
            <Input id="manifestName" {...form.register("manifestName")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="manifestShortName">Короткое имя</Label>
            <Input id="manifestShortName" {...form.register("manifestShortName")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="manifestThemeColor">Цвет темы (theme_color)</Label>
            <Input
              id="manifestThemeColor"
              type="color"
              className="h-10 w-24 p-1"
              {...form.register("manifestThemeColor")}
            />
            {errors.manifestThemeColor ? (
              <p className="text-destructive text-xs">
                {errors.manifestThemeColor.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="manifestBackgroundColor">Фон (background_color)</Label>
            <Input
              id="manifestBackgroundColor"
              type="color"
              className="h-10 w-24 p-1"
              {...form.register("manifestBackgroundColor")}
            />
            {errors.manifestBackgroundColor ? (
              <p className="text-destructive text-xs">
                {errors.manifestBackgroundColor.message}
              </p>
            ) : null}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ImageUpload
            label="Фавиконка"
            value={form.watch("faviconUrl")}
            onChange={(url) => form.setValue("faviconUrl", url)}
            hint="ICO или PNG"
          />
          <ImageUpload
            label="Иконка 192×192"
            value={form.watch("manifestIcon192Url")}
            onChange={(url) => form.setValue("manifestIcon192Url", url)}
          />
          <ImageUpload
            label="Иконка 512×512"
            value={form.watch("manifestIcon512Url")}
            onChange={(url) => form.setValue("manifestIcon512Url", url)}
          />
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
          <p className="text-muted-foreground text-xs">Сохранено в {savedAt}</p>
        ) : null}
        {errorMessage ? (
          <p className="text-destructive text-xs">{errorMessage}</p>
        ) : null}
      </div>
    </form>
  );
}
