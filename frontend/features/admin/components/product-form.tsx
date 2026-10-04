"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

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
  categoryId: "",
};

interface ProductFormProps {
  /** Absent on the create page. */
  product?: Product;
}

/** Admin create/edit product form. Ruble strings convert to kopecks and
 * the comma-separated genre field to an array before hitting the API. */
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

  async function onSubmit(values: ProductFormValues) {
    setError(null);
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
        <div className="space-y-1.5">
          <Label htmlFor="priceRub">Цена, ₽</Label>
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
          <Label htmlFor="stock">Количество, шт.</Label>
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
