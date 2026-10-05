"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  generalSettingsSchema,
  type GeneralSettingsValues,
} from "@/schemas/site-settings.schema";
import { ImageUpload } from "./image-upload";
import { useUpdateSettings } from "../hooks/use-site-settings";
import type { SiteSettings } from "@/types/api";

interface GeneralSettingsFormProps {
  settings: SiteSettings;
}

/** «Основные настройки» tab: name, support email, logo (upload), socials. */
export function GeneralSettingsForm({ settings }: GeneralSettingsFormProps) {
  const update = useUpdateSettings();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const form = useForm<GeneralSettingsValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      siteName: settings.siteName,
      supportEmail: settings.supportEmail,
      logoUrl: settings.logoUrl,
      socials: settings.socials.map((link) => ({
        label: link.label,
        url: link.url,
        iconUrl: link.iconUrl ?? "",
      })),
    },
  });
  const socials = useFieldArray({ control: form.control, name: "socials" });

  async function onSubmit(values: GeneralSettingsValues) {
    setSavedAt(null);
    try {
      await update.mutateAsync({
        // The PUT replaces the whole row — carry the untouched SEO fields.
        siteName: values.siteName,
        supportEmail: values.supportEmail,
        logoUrl: values.logoUrl,
        socials: values.socials.map((link) => ({
          label: link.label,
          url: link.url,
          ...(link.iconUrl ? { iconUrl: link.iconUrl } : {}),
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
          {form.formState.errors.siteName ? (
            <p className="text-destructive text-xs">
              {form.formState.errors.siteName.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="supportEmail">Почта поддержки</Label>
          <Input id="supportEmail" type="email" {...form.register("supportEmail")} />
          {form.formState.errors.supportEmail ? (
            <p className="text-destructive text-xs">
              {form.formState.errors.supportEmail.message}
            </p>
          ) : null}
        </div>
      </div>

      <ImageUpload
        label="Логотип"
        value={form.watch("logoUrl")}
        onChange={(url) => form.setValue("logoUrl", url)}
        hint="PNG или WebP, отображается в шапке и в админке"
      />
      {form.formState.errors.logoUrl ? (
        <p className="text-destructive text-xs">
          {form.formState.errors.logoUrl.message}
        </p>
      ) : null}

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
                  placeholder="https://t.me/gport"
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
