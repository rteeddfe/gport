"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  homeContentSchema,
  type HomeContentValues,
} from "@/schemas/home-content.schema";
import { updateHomeContent } from "@/services/home-content.service";
import type { HomeContent } from "@/types/api";

interface HomeContentFormProps {
  content: HomeContent;
}

const TILE_LABELS = ["Тезис 01", "Тезис 02", "Тезис 03", "Тезис 04"];

/** «Главная страница» tab: the hero banner texts (kicker, h1 with the
 * gradient accent, subtitle, CTA and the four advantage tiles). */
export function HomeContentForm({ content }: HomeContentFormProps) {
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<HomeContentValues>({
    resolver: zodResolver(homeContentSchema),
    defaultValues: {
      kicker: content.kicker,
      title: content.title,
      titleAccent: content.titleAccent,
      subtitle: content.subtitle,
      ctaLabel: content.ctaLabel,
      ctaHref: content.ctaHref,
      tiles: content.tiles,
    },
  });
  const errors = form.formState.errors;

  async function onSubmit(values: HomeContentValues) {
    setIsPending(true);
    setErrorMessage(null);
    setSavedAt(null);
    try {
      await updateHomeContent({
        kicker: values.kicker,
        title: values.title,
        titleAccent: values.titleAccent,
        subtitle: values.subtitle || "",
        ctaLabel: values.ctaLabel,
        ctaHref: values.ctaHref,
        tiles: values.tiles,
      });
      setSavedAt(new Date().toLocaleTimeString("ru-RU"));
    } catch (cause) {
      setErrorMessage(cause instanceof Error ? cause.message : "Ошибка");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="kicker">Кикер (над заголовком)</Label>
          <Input id="kicker" {...form.register("kicker")} />
          {errors.kicker ? (
            <p className="text-destructive text-xs">{errors.kicker.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ctaHref">Ссылка кнопки</Label>
          <Input id="ctaHref" placeholder="/products" {...form.register("ctaHref")} />
          {errors.ctaHref ? (
            <p className="text-destructive text-xs">{errors.ctaHref.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="title">Заголовок</Label>
          <Input id="title" {...form.register("title")} />
          {errors.title ? (
            <p className="text-destructive text-xs">{errors.title.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="titleAccent">Акцент заголовка (градиент)</Label>
          <Input id="titleAccent" {...form.register("titleAccent")} />
          {errors.titleAccent ? (
            <p className="text-destructive text-xs">
              {errors.titleAccent.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="subtitle">Подзаголовок (необязательно)</Label>
        <Input id="subtitle" {...form.register("subtitle")} />
        {errors.subtitle ? (
          <p className="text-destructive text-xs">{errors.subtitle.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ctaLabel">Текст кнопки</Label>
        <Input id="ctaLabel" {...form.register("ctaLabel")} />
        {errors.ctaLabel ? (
          <p className="text-destructive text-xs">{errors.ctaLabel.message}</p>
        ) : null}
      </div>

      <div>
        <p className="text-sm font-medium">Тезисы плиток 01–04</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {TILE_LABELS.map((label, index) => (
            <div key={label} className="space-y-1.5">
              <Label htmlFor={`tile-${index}`}>{label}</Label>
              <Input id={`tile-${index}`} {...form.register(`tiles.${index}`)} />
              {errors.tiles?.message ? (
                <p className="text-destructive text-xs">{errors.tiles.message}</p>
              ) : (
                errors.tiles?.[index]?.message && (
                  <p className="text-destructive text-xs">
                    {errors.tiles[index]?.message}
                  </p>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending ? (
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
