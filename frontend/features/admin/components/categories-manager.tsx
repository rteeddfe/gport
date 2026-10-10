"use client";

import { getErrorMessage } from "@/lib/api/errors";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
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
import {
  useAdminCategoryMutations,
  useCategories,
} from "../hooks/use-admin-categories";
import {
  categorySchema,
  type CategoryFormValues,
} from "@/schemas/category.schema";
import { SECTIONS } from "@/lib/sections";
import type { Category } from "@/types/api";

function productsLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} товар`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} товара`;
  }
  return `${count} товаров`;
}

/** One editable category card: PATCH on save, DELETE with a confirm step
 * (the backend refuses to delete a category that still has products). */
function CategoryCard({ category }: { category: Category }) {
  const { update, remove } = useAdminCategoryMutations();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      type: SECTIONS.some((section) => section.value === category.type)
        ? (category.type as CategoryFormValues["type"])
        : undefined,
    },
  });

  async function onSubmit(values: CategoryFormValues) {
    setError(null);
    try {
      await update.mutateAsync({
        id: category.id,
        input: {
          name: values.name,
          ...(values.slug ? { slug: values.slug } : {}),
          ...(values.description ? { description: values.description } : {}),
          type: values.type,
        },
      });
      setSavedAt(new Date().toLocaleTimeString("ru-RU"));
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  async function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError(null);
    try {
      await remove.mutateAsync(category.id);
    } catch (cause) {
      setError(getErrorMessage(cause));
      setConfirmDelete(false);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="border-border bg-surface space-y-3 rounded-xl border p-4"
    >
      <div className="grid gap-3 lg:grid-cols-[2fr_1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor={`name-${category.id}`}>Название</Label>
          <Input id={`name-${category.id}`} {...form.register("name")} />
          {form.formState.errors.name ? (
            <p className="text-destructive text-xs">
              {form.formState.errors.name.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`slug-${category.id}`}>Slug (URL)</Label>
          <Input
            id={`slug-${category.id}`}
            placeholder="games"
            {...form.register("slug")}
          />
          {form.formState.errors.slug ? (
            <p className="text-destructive text-xs">
              {form.formState.errors.slug.message}
            </p>
          ) : null}
        </div>
        <div className="flex items-end">
          <Badge variant="secondary">{productsLabel(category.productsCount)}</Badge>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`description-${category.id}`}>Описание</Label>
        <Textarea
          id={`description-${category.id}`}
          rows={2}
          {...form.register("description")}
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Раздел</Label>
          <Select
            value={form.watch("type") ?? ""}
            onValueChange={(value) =>
              form.setValue("type", value as CategoryFormValues["type"])
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Выберите раздел" />
            </SelectTrigger>
            <SelectContent>
              {SECTIONS.map((section) => (
                <SelectItem key={section.value} value={section.value}>
                  {section.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.type ? (
            <p className="text-destructive text-xs">
              {form.formState.errors.type.message}
            </p>
          ) : null}
          <p className="text-muted-foreground text-xs">
            Разделы заданы системой: Игры, Подписки, Валюта и пополнение.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" variant="outline" className="gap-1.5">
          {update.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          Сохранить
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-destructive gap-1.5"
          onClick={onDelete}
        >
          <Trash2 className="size-4" aria-hidden />
          {confirmDelete ? "Точно удалить?" : "Удалить"}
        </Button>
        <span className="text-muted-foreground font-mono text-xs">
          /products?category={category.slug}
        </span>
        {savedAt ? (
          <span className="text-muted-foreground text-xs">
            Сохранено в {savedAt}
          </span>
        ) : null}
        {error ? <span className="text-destructive text-xs">{error}</span> : null}
      </div>
    </form>
  );
}

function NewCategoryCard() {
  const { create } = useAdminCategoryMutations();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", slug: "", description: "", type: undefined },
  });

  async function onSubmit(values: CategoryFormValues) {
    setError(null);
    try {
      await create.mutateAsync({
        name: values.name,
        ...(values.slug ? { slug: values.slug } : {}),
        ...(values.description ? { description: values.description } : {}),
        type: values.type,
      });
      form.reset();
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="border-border border-dashed space-y-3 rounded-xl border p-4"
    >
      <p className="text-sm font-semibold">Новая категория</p>
      <div className="grid gap-3 lg:grid-cols-[2fr_1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="new-category-name">Название</Label>
          <Input
            id="new-category-name"
            placeholder="Подписки"
            {...form.register("name")}
          />
          {form.formState.errors.name ? (
            <p className="text-destructive text-xs">
              {form.formState.errors.name.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-category-slug">Slug (необязательно)</Label>
          <Input
            id="new-category-slug"
            placeholder="subscriptions"
            {...form.register("slug")}
          />
          {form.formState.errors.slug ? (
            <p className="text-destructive text-xs">
              {form.formState.errors.slug.message}
            </p>
          ) : null}
        </div>
        <div className="flex items-end">
          <Button type="submit" size="sm" className="gap-1.5" disabled={create.isPending}>
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
            Добавить
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-category-description">Описание</Label>
        <Textarea
          id="new-category-description"
          rows={2}
          placeholder="Появится в описании раздела каталога"
          {...form.register("description")}
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Раздел</Label>
          <Select
            value={form.watch("type") ?? ""}
            onValueChange={(value) =>
              form.setValue("type", value as CategoryFormValues["type"])
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Выберите раздел" />
            </SelectTrigger>
            <SelectContent>
              {SECTIONS.map((section) => (
                <SelectItem key={section.value} value={section.value}>
                  {section.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.type ? (
            <p className="text-destructive text-xs">
              {form.formState.errors.type.message}
            </p>
          ) : null}
          <p className="text-muted-foreground text-xs">
            Разделы заданы системой: Игры, Подписки, Валюта и пополнение.
          </p>
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        Без slug он сгенерируется из названия автоматически. Категорию с
        товарами удалить нельзя — сначала перенесите или удалите товары.
      </p>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </form>
  );
}

/** Admin categories: create, edit and delete (empty) categories. */
export function CategoriesManager() {
  const query = useCategories();

  if (query.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <p className="text-destructive text-sm">
        Не удалось загрузить категории: {query.error.message}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <NewCategoryCard />
      {query.data.map((category) => (
        <CategoryCard key={category.id} category={category} />
      ))}
      {query.data.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Категорий пока нет — добавьте первую выше.
        </p>
      ) : null}
    </div>
  );
}
