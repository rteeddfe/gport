"use client";

import { getErrorMessage } from "@/lib/api/errors";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { LIST_KINDS, listKindLabel } from "@/lib/list-kinds";
import { cn } from "@/lib/utils";
import {
  useAdminListValueMutations,
  useListValues,
} from "../hooks/use-admin-list-values";
import type { ListValue } from "@/types/api";

/** Mirrors the backend CreateListValueDto. An empty slug means «generate
 * from the name» on the backend. */
const listValueSchema = z.object({
  name: z.string().trim().min(1, "Укажите название").max(100, "Не длиннее 100 символов"),
  slug: z
    .string()
    .trim()
    .regex(/^$|^[a-z0-9]+(-[a-z0-9]+)*$/, "Латиница в нижнем регистре, через дефис")
    .max(100),
});

type ListValueFormValues = z.infer<typeof listValueSchema>;

/** One editable value row: PATCH on save, DELETE with a confirm step.
 * Products referencing the slug keep working — the value just leaves the
 * selects and filter labels. */
function ListValueCard({ value }: { value: ListValue }) {
  const { update, remove } = useAdminListValueMutations();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ListValueFormValues>({
    resolver: zodResolver(listValueSchema),
    defaultValues: { name: value.name, slug: value.slug },
  });

  async function onSubmit(values: ListValueFormValues) {
    setError(null);
    try {
      await update.mutateAsync({
        id: value.id,
        input: {
          name: values.name,
          ...(values.slug !== value.slug && values.slug ? { slug: values.slug } : {}),
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
      await remove.mutateAsync(value.id);
    } catch (cause) {
      setError(getErrorMessage(cause));
      setConfirmDelete(false);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="border-border bg-surface grid gap-3 rounded-xl border p-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
    >
      <div className="space-y-1.5">
        <Label htmlFor={`name-${value.id}`}>Название</Label>
        <Input id={`name-${value.id}`} {...form.register("name")} />
        {form.formState.errors.name ? (
          <p className="text-destructive text-xs">
            {form.formState.errors.name.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`slug-${value.id}`}>Slug</Label>
        <Input id={`slug-${value.id}`} {...form.register("slug")} />
        {form.formState.errors.slug ? (
          <p className="text-destructive text-xs">
            {form.formState.errors.slug.message}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
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
          {confirmDelete ? "Точно?" : ""}
        </Button>
      </div>
      {savedAt || error ? (
        <div className="sm:col-span-3">
          {savedAt ? (
            <span className="text-muted-foreground text-xs">
              Сохранено в {savedAt}
            </span>
          ) : null}
          {error ? <span className="text-destructive text-xs">{error}</span> : null}
        </div>
      ) : null}
    </form>
  );
}

function NewListValueCard({ kind }: { kind: string }) {
  const { create } = useAdminListValueMutations();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ListValueFormValues>({
    resolver: zodResolver(listValueSchema),
    defaultValues: { name: "", slug: "" },
  });

  async function onSubmit(values: ListValueFormValues) {
    setError(null);
    try {
      await create.mutateAsync({
        kind,
        name: values.name,
        ...(values.slug ? { slug: values.slug } : {}),
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
      className="border-border border-dashed grid gap-3 rounded-xl border p-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
    >
      <div className="space-y-1.5">
        <Label htmlFor={`new-${kind}-name`}>Название</Label>
        <Input
          id={`new-${kind}-name`}
          placeholder="Хит"
          {...form.register("name")}
        />
        {form.formState.errors.name ? (
          <p className="text-destructive text-xs">
            {form.formState.errors.name.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`new-${kind}-slug`}>Slug (необязательно)</Label>
        <Input
          id={`new-${kind}-slug`}
          placeholder="hit"
          {...form.register("slug")}
        />
        {form.formState.errors.slug ? (
          <p className="text-destructive text-xs">
            {form.formState.errors.slug.message}
          </p>
        ) : null}
      </div>
      <Button type="submit" size="sm" className="gap-1.5" disabled={create.isPending}>
        {create.isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Plus className="size-4" aria-hidden />
        )}
        Добавить
      </Button>
      {error ? (
        <p className="text-destructive text-xs sm:col-span-3">{error}</p>
      ) : null}
    </form>
  );
}

/** Admin «Списки»: fixed kinds (the admin fills values, never kinds) —
 * each value (name + slug) feeds the product form selects and the
 * catalog filters. */
export function ListsManager() {
  const [kind, setKind] = useState<string>("tags");
  const query = useListValues();

  if (query.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <p className="text-destructive text-sm">
        Не удалось загрузить списки: {query.error.message}
      </p>
    );
  }

  const values = query.data.filter((value) => value.kind === kind);

  return (
    <div className="space-y-4">
      <nav aria-label="Виды списков" className="flex flex-wrap gap-1">
        {LIST_KINDS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setKind(item.value)}
            aria-pressed={kind === item.value}
            className={cn(
              "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm transition-colors",
              kind === item.value
                ? "bg-raised font-medium text-foreground"
                : "text-muted-foreground hover:bg-raised/50 hover:text-foreground",
            )}
          >
            {item.label}
            <span className="text-xs opacity-60">
              {query.data.filter((value) => value.kind === item.value).length}
            </span>
          </button>
        ))}
      </nav>

      <NewListValueCard kind={kind} />
      {values.map((value) => (
        <ListValueCard key={value.id} value={value} />
      ))}
      {values.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          В списке «{listKindLabel(kind)}» пока нет значений — добавьте первое выше.
        </p>
      ) : null}
      <p className="text-muted-foreground text-xs">
        Значения выбираются в форме товара, слаги хранятся у товара и
        участвуют в фильтрах каталога. Сами списки без роутов.
      </p>
    </div>
  );
}
