"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { Controller, useFieldArray, useForm, type Control, type FieldErrors } from "react-hook-form";

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
  homeContentSchema,
  type HomeContentValues,
} from "@/schemas/home-content.schema";
import { useAdminProducts } from "@/features/admin/hooks/use-admin-products";
import { revalidateStorefrontTags } from "@/lib/revalidate";
import { updateHomeContent } from "@/services/home-content.service";
import type { HomeContent } from "@/types/api";
import { ImageUpload } from "./image-upload";

interface HomeContentFormProps {
  content: HomeContent;
}

const TILE_LABELS = ["Тезис 01", "Тезис 02", "Тезис 03", "Тезис 04"];

type CardListName = "wallCards" | "carouselCards";

type ServiceListName = "topupServices" | "serviceCards";

/** Editor of the service lists (the home top-up form and the service
 * wall): each row picks a top-up product and may override its mini
 * logo. Unknown/unpublished products silently drop out on render. */
function ServicesField({
  control,
  errors,
  name,
  title,
  hint,
  emptyHint,
  max,
  products,
}: {
  control: Control<HomeContentValues>;
  errors: FieldErrors<HomeContentValues>;
  name: ServiceListName;
  title: string;
  hint: string;
  emptyHint: string;
  max: number;
  products: { id: string; title: string }[];
}) {
  const array = useFieldArray({ control, name });
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={array.fields.length >= max || products.length === 0}
          onClick={() => array.append({ productId: "", iconUrl: "" })}
        >
          <Plus className="size-4" aria-hidden />
          Добавить сервис
        </Button>
      </div>

      {array.fields.length > 0 ? (
        <div className="mt-3 space-y-3">
          {array.fields.map((field, index) => (
            <div
              key={field.id}
              className="border-border bg-canvas/40 grid gap-3 rounded-xl border p-4 lg:grid-cols-[minmax(0,1fr)_200px]"
            >
              <div className="space-y-1.5">
                <Label>Сервис (товар пополнения)</Label>
                <Controller
                  control={control}
                  name={`${name}.${index}.productId` as const}
                  render={({ field: productField }) => (
                    <Select value={productField.value} onValueChange={productField.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите сервис" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors[name]?.[index]?.productId ? (
                  <p className="text-destructive text-xs">
                    {errors[name]?.[index]?.productId?.message}
                  </p>
                ) : null}
              </div>
              <div className="flex items-end justify-between gap-2">
                <Controller
                  control={control}
                  name={`${name}.${index}.iconUrl` as const}
                  render={({ field: iconField }) => (
                    <ImageUpload
                      label="Мини-лого"
                      value={iconField.value ?? ""}
                      onChange={iconField.onChange}
                      hint="иначе обложка"
                    />
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => array.remove(index)}
                >
                  Удалить
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground mt-3 text-xs">{emptyHint}</p>
      )}
    </div>
  );
}

/** Shared editor of the image+link card lists (the top-up wall and the
 * hero cylinder): add/remove rows, upload an image, set the link. */
function CardsField({
  control,
  errors,
  name,
  title,
  hint,
  emptyHint,
}: {
  control: Control<HomeContentValues>;
  errors: FieldErrors<HomeContentValues>;
  name: CardListName;
  title: string;
  hint: string;
  emptyHint: string;
}) {
  const array = useFieldArray({ control, name });
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={array.fields.length >= 12}
          onClick={() => array.append({ imageUrl: "", href: "" })}
        >
          <Plus className="size-4" aria-hidden />
          Добавить карточку
        </Button>
      </div>

      {array.fields.length > 0 ? (
        <div className="mt-3 space-y-3">
          {array.fields.map((field, index) => (
            <div
              key={field.id}
              className="border-border bg-canvas/40 rounded-xl border p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Карточка {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => array.remove(index)}
                >
                  Удалить
                </Button>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <Controller
                  control={control}
                  name={`${name}.${index}.imageUrl` as const}
                  render={({ field: imageField }) => (
                    <ImageUpload
                      label="Изображение"
                      value={imageField.value}
                      onChange={imageField.onChange}
                      hint="Весь тайл — картинка-ссылка"
                    />
                  )}
                />
                <div className="space-y-1.5">
                  <Label htmlFor={`${name}-${index}-href`}>Ссылка</Label>
                  <Input
                    id={`${name}-${index}-href`}
                    placeholder="/products/slug"
                    {...control.register(`${name}.${index}.href` as const)}
                  />
                  {errors[name]?.[index]?.href ? (
                    <p className="text-destructive text-xs">
                      {errors[name]?.[index]?.href?.message}
                    </p>
                  ) : null}
                  {errors[name]?.[index]?.imageUrl ? (
                    <p className="text-destructive text-xs">
                      {errors[name]?.[index]?.imageUrl?.message}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground mt-3 text-xs">{emptyHint}</p>
      )}
    </div>
  );
}

/** «Главная страница» tab: the hero banner texts (kicker, h1 with the
 * gradient accent, subtitle, CTA), the four advantage tiles, the service
 * pickers for the top-up form and the service wall, and the hero
 * cylinder cards (image + link each). */
export function HomeContentForm({ content }: HomeContentFormProps) {
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const products = useAdminProducts({ limit: 100 });
  const allProducts = products.data?.items ?? [];
  // The home FORM sells buyer-entered amounts only; the WALL may show
  // any top-up service (amount or nominal).
  const amountProducts = allProducts
    .filter((product) => product.kind === "TOPUP_AMOUNT")
    .map((product) => ({ id: product.id, title: product.title }));
  const topupProducts = allProducts
    .filter((product) => product.kind !== "GAME_KEY")
    .map((product) => ({ id: product.id, title: product.title }));

  // The trust block renders two fixed slots per list; pad the stored
  // rows with blank ones so both slots always have a bound value.
  const EMPTY_STAT = { label: "", prefix: "", value: "", description: "" };
  const EMPTY_COMMUNITY = {
    brand: "telegram" as const,
    name: "",
    description: "",
    usersCount: "",
    usersLabel: "",
    url: "",
  };
  const statCards = [0, 1].map((i) => content.statCards[i] ?? EMPTY_STAT);
  const communityCards = [0, 1].map(
    (i) => content.communityCards[i] ?? EMPTY_COMMUNITY,
  );

  const form = useForm<HomeContentValues>({
    resolver: zodResolver(homeContentSchema),
    defaultValues: {
      kicker: content.kicker,
      title: content.title,
      titleAccent: content.titleAccent,
      subtitle: content.subtitle,
      ctaPrimaryLabel: content.ctaPrimaryLabel,
      ctaPrimaryHref: content.ctaPrimaryHref,
      ctaLabel: content.ctaLabel,
      ctaHref: content.ctaHref,
      tiles: content.tiles,
      wallCards: content.wallCards,
      carouselCards: content.carouselCards,
      topupServices: content.topupServices.map((service) => ({
        productId: service.productId,
        iconUrl: service.iconUrl ?? "",
      })),
      serviceCards: content.serviceCards.map((service) => ({
        productId: service.productId,
        iconUrl: service.iconUrl ?? "",
      })),
      statCards,
      communityLabel: content.communityLabel,
      communityCards,
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
        ctaPrimaryLabel: values.ctaPrimaryLabel,
        ctaPrimaryHref: values.ctaPrimaryHref,
        ctaLabel: values.ctaLabel,
        ctaHref: values.ctaHref,
        tiles: values.tiles,
        wallCards: values.wallCards,
        carouselCards: values.carouselCards,
        topupServices: values.topupServices.map((service) => ({
          productId: service.productId,
          iconUrl: service.iconUrl ?? null,
        })),
        serviceCards: values.serviceCards.map((service) => ({
          productId: service.productId,
          iconUrl: service.iconUrl ?? null,
        })),
        statCards: values.statCards,
        communityLabel: values.communityLabel,
        communityCards: values.communityCards,
      });
      void revalidateStorefrontTags(["home-content"]);
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

      <div>
        <p className="text-sm font-medium">Кнопки героя</p>
        <p className="text-muted-foreground text-xs">
          Обе пары — текст и ссылка. Пустая пара — кнопка не выводится.
        </p>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div className="border-border space-y-3 rounded-xl border p-4">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Кнопка 1 — основная (заливка)
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="ctaPrimaryLabel">Текст</Label>
              <Input
                id="ctaPrimaryLabel"
                placeholder="Пополнение"
                {...form.register("ctaPrimaryLabel")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ctaPrimaryHref">Ссылка</Label>
              <Input
                id="ctaPrimaryHref"
                placeholder="/topup"
                {...form.register("ctaPrimaryHref")}
              />
            </div>
          </div>
          <div className="border-border space-y-3 rounded-xl border p-4">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Кнопка 2 — контурная
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="ctaLabel">Текст</Label>
              <Input id="ctaLabel" placeholder="Каталог игр" {...form.register("ctaLabel")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ctaHref">Ссылка</Label>
              <Input id="ctaHref" placeholder="/products" {...form.register("ctaHref")} />
            </div>
          </div>
        </div>
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

      <ServicesField
        control={form.control}
        errors={errors}
        name="topupServices"
        title="Сервисы формы пополнения (второй блок)"
        hint="Выбираются из товаров-пополнений по сумме. Комиссия сервиса задаётся в карточке товара. Пустой список — блок без формы."
        emptyHint="Сервисы не выбраны — форма на главной скрыта."
        max={8}
        products={amountProducts}
      />

      <ServicesField
        control={form.control}
        errors={errors}
        name="serviceCards"
        title="Карточки сервисов (третий блок)"
        hint="До 7 сервисов пополнения вокруг плитки «Посмотреть все»; карточка ведёт на персональную страницу пополнения. Пустой список — блок не выводится."
        emptyHint="Карточки не заданы — блок на главной скрыт."
        max={7}
        products={topupProducts}
      />

      <CardsField
        control={form.control}
        errors={errors}
        name="wallCards"
        title="Произвольные карточки-ссылки (устаревшие)"
        hint="Изображение + ссылка. Показываются только если не заданы карточки сервисов выше."
        emptyHint="Не заданы — используется стандартный блок."
      />

      <CardsField
        control={form.control}
        errors={errors}
        name="carouselCards"
        title="Крутящиеся карточки первого блока"
        hint="Изображение и ссылка каждой карточки цилиндра. Пустой список — остаются стандартные обложки (без ссылок)."
        emptyHint="Карточки не заданы — используется стандартный цилиндр."
      />

      <div>
        <p className="text-sm font-medium">
          Блок доверия (перед новостями): статистика
        </p>
        <p className="text-muted-foreground text-xs">
          Две плитки с цифрами. Пустое значение — плитка не выводится; оба
          пустых — блок скрыт.
        </p>
        {[0, 1].map((index) => (
          <div key={index} className="border-border bg-canvas/40 mt-3 rounded-xl border p-4">
            <p className="text-xs font-semibold">Плитка {index + 1}</p>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`stat-${index}-label`}>Бейдж</Label>
                <Input
                  id={`stat-${index}-label`}
                  placeholder="Количество клиентов:"
                  {...form.register(`statCards.${index}.label`)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`stat-${index}-prefix`}>Слово перед числом</Label>
                <Input
                  id={`stat-${index}-prefix`}
                  placeholder="Более"
                  {...form.register(`statCards.${index}.prefix`)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`stat-${index}-value`}>Число (градиент)</Label>
                <Input
                  id={`stat-${index}-value`}
                  placeholder="136 684"
                  {...form.register(`statCards.${index}.value`)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`stat-${index}-description`}>Подпись</Label>
                <Input
                  id={`stat-${index}-description`}
                  placeholder="довольных клиентов"
                  {...form.register(`statCards.${index}.description`)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="space-y-1.5">
          <Label htmlFor="communityLabel">
            Блок доверия: заголовок соцсетей
          </Label>
          <Input
            id="communityLabel"
            placeholder="Наши социальные сети"
            {...form.register("communityLabel")}
          />
          <p className="text-muted-foreground text-xs">
            Пустые карточки (имя или ссылка) не выводятся.
          </p>
        </div>
        {[0, 1].map((index) => (
          <div
            key={index}
            className="border-border bg-canvas/40 mt-3 rounded-xl border p-4"
          >
            <p className="text-xs font-semibold">Соцсеть {index + 1}</p>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Сеть</Label>
                <Controller
                  control={form.control}
                  name={`communityCards.${index}.brand` as const}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="telegram">Telegram</SelectItem>
                        <SelectItem value="vk">ВКонтакте</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Название</Label>
                <Input placeholder="@gport" {...form.register(`communityCards.${index}.name`)} />
              </div>
              <div className="space-y-1.5">
                <Label>Описание</Label>
                <Input
                  placeholder="Конкурсы и самые свежие новости игрового мира!"
                  {...form.register(`communityCards.${index}.description`)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Юзеры</Label>
                  <Input placeholder="10 000+" {...form.register(`communityCards.${index}.usersCount`)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Подпись юзеров</Label>
                  <Input
                    placeholder="регулярных юзеров"
                    {...form.register(`communityCards.${index}.usersLabel`)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Ссылка</Label>
                <Input placeholder="https://t.me/gport" {...form.register(`communityCards.${index}.url`)} />
              </div>
            </div>
          </div>
        ))}
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
