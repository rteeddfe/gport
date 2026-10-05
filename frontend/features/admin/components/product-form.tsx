"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toCents } from "@/lib/money";
import { useAdminProductMutations } from "../hooks/use-admin-products";
import { useCategories } from "../hooks/use-admin-categories";
import { ProductImagesField } from "./product-images-field";
import { ProductFaqField } from "./product-faq-field";
import { ProductKeysField } from "./product-keys-field";
import {
  productSchema,
  type ProductFormValues,
} from "@/schemas/product.schema";
import type { Product } from "@/types/api";

export const PRODUCT_STATUS_LABELS = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликован",
  ARCHIVED: "В архиве",
} as const;

export const PRODUCT_KIND_LABELS = {
  GAME_KEY: "Ключ / код активации",
  TOPUP_NOMINAL: "Пополнение по номиналам",
  TOPUP_AMOUNT: "Пополнение по сумме",
} as const;

const ACCOUNT_KIND_LABELS = {
  "": "Не требуется (ключевые товары)",
  LOGIN: "Логин аккаунта",
  ID: "ID игрока",
  EMAIL: "Email получателя",
} as const;

function formValuesFrom(product: Product): ProductFormValues {
  return {
    title: product.title,
    slug: product.slug,
    description: product.description ?? "",
    instruction: product.instruction ?? "",
    region: product.region ?? "",
    platform: product.platform ?? "",
    genre: product.genre.join(", "),
    localization: product.localization ?? "",
    ageRating: product.ageRating ?? "",
    images: product.images,
    priceRub: (product.priceCents / 100).toString(),
    oldPriceRub: product.oldPriceCents ? (product.oldPriceCents / 100).toString() : "",
    stock: String(product.stock),
    status: product.status,
    kind: product.kind,
    minAmountRub: product.minValue != null ? (product.minValue / 100).toString() : "",
    maxAmountRub: product.maxValue != null ? (product.maxValue / 100).toString() : "",
    creditingMode: product.creditingMode,
    accountFieldKind: product.accountFieldKind ?? "",
    accountFieldLabel: product.accountFieldLabel ?? "",
    accountFieldHint: product.accountFieldHint ?? "",
    variants: product.variants.map((variant) => ({
      label: variant.label,
      value: variant.value != null ? String(variant.value) : "",
      unit: variant.unit ?? "",
      priceRub: (variant.priceCents / 100).toString(),
      oldPriceRub: variant.oldPriceCents ? (variant.oldPriceCents / 100).toString() : "",
    })),
    categoryId: product.categoryId,
  };
}

const EMPTY_VALUES: ProductFormValues = {
  title: "",
  slug: "",
  description: "",
  instruction: "",
  region: "",
  platform: "",
  genre: "",
  localization: "",
  ageRating: "",
  images: [],
  priceRub: "",
  oldPriceRub: "",
  stock: "0",
  status: "DRAFT",
  kind: "GAME_KEY",
  minAmountRub: "",
  maxAmountRub: "",
  creditingMode: "AUTO_CODE",
  accountFieldKind: "",
  accountFieldLabel: "",
  accountFieldHint: "",
  variants: [],
  categoryId: "",
};

interface ProductFormProps {
  /** Absent on the create page. */
  product?: Product;
}

/** Admin create/edit product form. Ruble strings convert to kopecks and
 * the comma-separated genre field to an array before hitting the API.
 * The kind decides the checkout: keys (quantity), nominals (variant
 * list) or an amount range — plus the account field top-up buyers fill. */
export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const { create, update } = useAdminProductMutations();
  const categories = useCategories();
  const [error, setError] = useState<string | null>(null);
  const editMode = product !== undefined;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? formValuesFrom(product) : EMPTY_VALUES,
  });
  const errors = form.formState.errors;
  const kind = form.watch("kind");
  const variantsArray = useFieldArray({ control: form.control, name: "variants" });

  async function onSubmit(values: ProductFormValues) {
    setError(null);
    const isTopUp = values.kind !== "GAME_KEY";
    const input = {
      title: values.title,
      slug: values.slug || undefined,
      description: values.description.trim() || undefined,
      instruction: values.instruction.trim() || undefined,
      region: values.region.trim() || undefined,
      platform: values.platform.trim() || undefined,
      genre: values.genre
        .split(",")
        .map((genre) => genre.trim())
        .filter(Boolean),
      localization: values.localization.trim() || undefined,
      ageRating: values.ageRating.trim() || undefined,
      images: values.images,
      priceCents: toCents(values.priceRub),
      oldPriceCents: values.oldPriceRub ? toCents(values.oldPriceRub) : null,
      stock: Number(values.stock),
      status: values.status,
      kind: values.kind,
      minValue: values.kind === "TOPUP_AMOUNT" && values.minAmountRub ? toCents(values.minAmountRub) : null,
      maxValue: values.kind === "TOPUP_AMOUNT" && values.maxAmountRub ? toCents(values.maxAmountRub) : null,
      creditingMode: values.creditingMode,
      accountFieldKind: isTopUp && values.accountFieldKind ? values.accountFieldKind : null,
      accountFieldLabel: isTopUp && values.accountFieldLabel.trim() ? values.accountFieldLabel.trim() : null,
      accountFieldHint: isTopUp && values.accountFieldHint.trim() ? values.accountFieldHint.trim() : null,
      variants:
        values.kind === "TOPUP_NOMINAL"
          ? values.variants.map((variant) => ({
              label: variant.label,
              value: variant.value ? Number(variant.value) : null,
              unit: variant.unit.trim() || null,
              priceCents: toCents(variant.priceRub),
              oldPriceCents: variant.oldPriceRub ? toCents(variant.oldPriceRub) : null,
            }))
          : [],
      categoryId: values.categoryId,
    };
    try {
      if (editMode && product) {
        await update.mutateAsync({ id: product.id, input });
      } else {
        await create.mutateAsync(input);
      }
      router.push("/admin/products");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка");
    }
  }

  if (categories.isPending) {
    return <Skeleton className="h-96 w-full" />;
  }
  if (categories.isError) {
    return (
      <p className="text-destructive text-sm">
        Не удалось загрузить категории: {categories.error.message}
      </p>
    );
  }
  const categoryOptions = categories.data;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="title">Название</Label>
          <Input id="title" placeholder="Cyberpunk 2077" {...form.register("title")} />
          {errors.title ? (
            <p className="text-destructive text-xs">{errors.title.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug (URL)</Label>
          <Input id="slug" placeholder="cyberpunk-2077" {...form.register("slug")} />
          {errors.slug ? (
            <p className="text-destructive text-xs">{errors.slug.message}</p>
          ) : null}
          <p className="text-muted-foreground text-xs">
            Пусто — сгенерируется из названия. Страница товара:
            /products/&lt;slug&gt;
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Категория</Label>
          <Select
            value={form.watch("categoryId")}
            onValueChange={(value) => form.setValue("categoryId", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Выберите категорию" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryId ? (
            <p className="text-destructive text-xs">{errors.categoryId.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label>Статус</Label>
          <Select
            value={form.watch("status")}
            onValueChange={(value) =>
              form.setValue("status", value as ProductFormValues["status"])
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRODUCT_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            Витрина показывает только «Опубликован».
          </p>
        </div>
      </section>

      {/* Тип товара и выдача */}
      <section className="border-border bg-canvas/40 rounded-2xl border p-4 sm:p-6">
        <h2 className="text-sm font-semibold">Тип товара и выдача</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Тип</Label>
            <Select
              value={kind}
              onValueChange={(value) =>
                form.setValue("kind", value as ProductFormValues["kind"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRODUCT_KIND_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Ключ — покупают по количеству, код из пула ниже. Номиналы —
              выбор пакета. Сумма — покупатель вводит сумму пополнения.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Выдача</Label>
            <Select
              value={form.watch("creditingMode")}
              onValueChange={(value) =>
                form.setValue("creditingMode", value as ProductFormValues["creditingMode"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUTO_CODE">Автоматически (код из пула)</SelectItem>
                <SelectItem value="MANUAL">Вручную (оператор после оплаты)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Ручной режим — для пополнений, где нет интеграции с
              поставщиком; ключи и гифт-коды выдавайте автоматически.
            </p>
          </div>
        </div>

        {kind === "TOPUP_AMOUNT" ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="minAmountRub">Минимальная сумма, ₽</Label>
              <Input
                id="minAmountRub"
                inputMode="decimal"
                placeholder="50"
                {...form.register("minAmountRub")}
              />
              {errors.minAmountRub ? (
                <p className="text-destructive text-xs">
                  {errors.minAmountRub.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxAmountRub">Максимальная сумма, ₽</Label>
              <Input
                id="maxAmountRub"
                inputMode="decimal"
                placeholder="14000"
                {...form.register("maxAmountRub")}
              />
              {errors.maxAmountRub ? (
                <p className="text-destructive text-xs">
                  {errors.maxAmountRub.message}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {kind !== "GAME_KEY" ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Поле аккаунта</Label>
              <Select
                value={form.watch("accountFieldKind")}
                onValueChange={(value) =>
                  form.setValue(
                    "accountFieldKind",
                    value as ProductFormValues["accountFieldKind"],
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCOUNT_KIND_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accountFieldLabel">Подпись поля</Label>
              <Input
                id="accountFieldLabel"
                placeholder="Логин Steam"
                {...form.register("accountFieldLabel")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accountFieldHint">Подсказка под полем</Label>
              <Input
                id="accountFieldHint"
                placeholder="Проверьте внимательно…"
                {...form.register("accountFieldHint")}
              />
            </div>
          </div>
        ) : null}

        {kind === "TOPUP_NOMINAL" ? (
          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Номиналы</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Пакеты на выбор покупателя — «60 UC», «1 месяц», «1000 ₽».
                  Порядок списка = порядок на витрине.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={variantsArray.fields.length >= 100}
                onClick={() =>
                  variantsArray.append({
                    label: "",
                    value: "",
                    unit: "",
                    priceRub: "",
                    oldPriceRub: "",
                  })
                }
              >
                <Plus className="size-4" aria-hidden />
                Добавить номинал
              </Button>
            </div>
            {errors.variants?.message ? (
              <p className="text-destructive mt-2 text-xs">
                {errors.variants.message}
              </p>
            ) : null}
            {variantsArray.fields.length > 0 ? (
              <div className="mt-3 space-y-2">
                {variantsArray.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="border-border bg-surface grid grid-cols-[1fr_repeat(3,80px)_100px_36px] items-start gap-2 rounded-xl border p-3"
                  >
                    <div className="space-y-1">
                      <Input
                        placeholder="Название («60 UC»)"
                        aria-label={`Номинал ${index + 1}: название`}
                        {...form.register(`variants.${index}.label`)}
                      />
                      {errors.variants?.[index]?.label ? (
                        <p className="text-destructive text-xs">
                          {errors.variants[index]?.label?.message}
                        </p>
                      ) : null}
                    </div>
                    <Input
                      placeholder="60"
                      aria-label={`Номинал ${index + 1}: значение`}
                      {...form.register(`variants.${index}.value`)}
                    />
                    <Input
                      placeholder="UC"
                      aria-label={`Номинал ${index + 1}: единица`}
                      {...form.register(`variants.${index}.unit`)}
                    />
                    <div className="space-y-1">
                      <Input
                        placeholder="86"
                        inputMode="decimal"
                        aria-label={`Номинал ${index + 1}: цена`}
                        {...form.register(`variants.${index}.priceRub`)}
                      />
                      {errors.variants?.[index]?.priceRub ? (
                        <p className="text-destructive text-xs">
                          {errors.variants[index]?.priceRub?.message}
                        </p>
                      ) : null}
                    </div>
                    <Input
                      placeholder="Цена до скидки"
                      inputMode="decimal"
                      aria-label={`Номинал ${index + 1}: цена до скидки`}
                      {...form.register(`variants.${index}.oldPriceRub`)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      aria-label={`Удалить номинал ${index + 1}`}
                      onClick={() => variantsArray.remove(index)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground mt-3 text-xs">
                Номиналов пока нет — добавьте хотя бы один перед публикацией.
              </p>
            )}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="priceRub">Цена, ₽ {kind === "TOPUP_AMOUNT" ? "(минимальная на витрине)" : kind === "TOPUP_NOMINAL" ? "(«от» на витрине)" : ""}</Label>
          <Input id="priceRub" inputMode="decimal" placeholder="1299" {...form.register("priceRub")} />
          {errors.priceRub ? (
            <p className="text-destructive text-xs">{errors.priceRub.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oldPriceRub">Цена до скидки, ₽</Label>
          <Input id="oldPriceRub" inputMode="decimal" placeholder="2599" {...form.register("oldPriceRub")} />
          {errors.oldPriceRub ? (
            <p className="text-destructive text-xs">{errors.oldPriceRub.message}</p>
          ) : null}
          <p className="text-muted-foreground text-xs">Пусто — без скидки.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stock">Количество, шт. {kind !== "GAME_KEY" ? "(не используется для пополнений)" : ""}</Label>
          <Input id="stock" inputMode="numeric" {...form.register("stock")} />
          {errors.stock ? (
            <p className="text-destructive text-xs">{errors.stock.message}</p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="region">Регион</Label>
          <Input id="region" placeholder="RU+CIS" {...form.register("region")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="platform">Платформа</Label>
          <Input id="platform" placeholder="Steam" {...form.register("platform")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="genre">Жанры</Label>
          <Input id="genre" placeholder="Action, RPG" {...form.register("genre")} />
          <p className="text-muted-foreground text-xs">Через запятую.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="localization">Локализация</Label>
          <Input id="localization" placeholder="RU" {...form.register("localization")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ageRating">Возрастной рейтинг</Label>
          <Input id="ageRating" placeholder="18+" {...form.register("ageRating")} />
        </div>
      </section>

      <section className="space-y-2">
        <Label>Обложки</Label>
        <ProductImagesField
          value={form.watch("images")}
          onChange={(urls) => form.setValue("images", urls)}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="description">Описание</Label>
          <Textarea
            id="description"
            rows={6}
            placeholder="Что это за игра и что входит в покупку"
            {...form.register("description")}
          />
          {errors.description ? (
            <p className="text-destructive text-xs">{errors.description.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="instruction">Инструкция активации</Label>
          <Textarea
            id="instruction"
            rows={6}
            placeholder="1. Скачайте Steam… 2. Активируйте ключ…"
            {...form.register("instruction")}
          />
          {errors.instruction ? (
            <p className="text-destructive text-xs">{errors.instruction.message}</p>
          ) : null}
        </div>
      </section>

      {product && product.kind === "GAME_KEY" && product.creditingMode === "AUTO_CODE" ? (
        <ProductKeysField productId={product.id} />
      ) : null}
      {product ? <ProductFaqField productId={product.id} /> : null}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={create.isPending || update.isPending} className="gap-2">
          {create.isPending || update.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          {editMode ? "Сохранить" : "Создать товар"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/admin/products">Отмена</Link>
        </Button>
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
      </div>
    </form>
  );
}
