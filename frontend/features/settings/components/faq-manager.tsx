"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  faqItemSchema,
  type FaqItemValues,
} from "@/schemas/faq.schema";
import {
  createFaqItem,
  deleteFaqItem,
  getAdminFaq,
  updateFaqItem,
} from "@/services/faq.service";
import { revalidateStorefrontTags } from "@/lib/revalidate";
import type { FaqCategory, FaqItem } from "@/types/api";

const CATEGORY_LABELS: Record<FaqCategory, string> = {
  topup: "Стим-пополнение",
  games: "Покупка игр",
};

function useFaqMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void revalidateStorefrontTags(["faq"]);
    queryClient.invalidateQueries({ queryKey: ["admin-faq"] });
  };
  const create = useMutation({
    mutationFn: createFaqItem,
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<FaqItemValues> }) =>
      updateFaqItem(id, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: deleteFaqItem,
    onSuccess: invalidate,
  });
  return { create, update, remove };
}

function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message : "Ошибка";
}

/** One editable FAQ card: PATCH on save, DELETE with a confirm step. */
function FaqCard({ item }: { item: FaqItem }) {
  const { update, remove } = useFaqMutations();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FaqItemValues>({
    resolver: zodResolver(faqItemSchema),
    defaultValues: {
      question: item.question,
      answer: item.answer,
      category: item.category,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    },
  });

  async function onSubmit(values: FaqItemValues) {
    setError(null);
    try {
      await update.mutateAsync({ id: item.id, input: values });
      setSavedAt(new Date().toLocaleTimeString("ru-RU"));
    } catch (cause) {
      setError(errorText(cause));
    }
  }

  async function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await remove.mutateAsync(item.id);
    } catch (cause) {
      setError(errorText(cause));
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
          <Label htmlFor={`q-${item.id}`}>Вопрос</Label>
          <Input id={`q-${item.id}`} {...form.register("question")} />
        </div>
        <div className="space-y-1.5">
          <Label>Категория</Label>
          <Select
            value={form.watch("category")}
            onValueChange={(value) =>
              form.setValue("category", value as FaqCategory)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="topup">{CATEGORY_LABELS.topup}</SelectItem>
              <SelectItem value="games">{CATEGORY_LABELS.games}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-3">
          <label className="flex h-10 items-center gap-2 text-sm">
            <Checkbox
              checked={form.watch("isActive")}
              onCheckedChange={(checked) => form.setValue("isActive", checked === true)}
              aria-label="Показывать на сайте"
            />
            Показывать
          </label>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`a-${item.id}`}>Ответ</Label>
        <Textarea id={`a-${item.id}`} rows={3} {...form.register("answer")} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`o-${item.id}`} className="text-xs">
            Порядок
          </Label>
          <Input
            id={`o-${item.id}`}
            type="number"
            min={0}
            className="w-20"
            {...form.register("sortOrder", { valueAsNumber: true })}
          />
        </div>
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

function NewFaqCard() {
  const { create } = useFaqMutations();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FaqItemValues>({
    resolver: zodResolver(faqItemSchema),
    defaultValues: {
      question: "",
      answer: "",
      category: "topup",
      sortOrder: 0,
      isActive: true,
    },
  });

  async function onSubmit(values: FaqItemValues) {
    setError(null);
    try {
      await create.mutateAsync(values);
      form.reset();
    } catch (cause) {
      setError(errorText(cause));
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="border-border border-dashed space-y-3 rounded-xl border p-4"
    >
      <p className="text-sm font-semibold">Новый вопрос</p>
      <div className="grid gap-3 lg:grid-cols-[2fr_1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="new-question">Вопрос</Label>
          <Input id="new-question" placeholder="Текст вопроса" {...form.register("question")} />
          {form.formState.errors.question ? (
            <p className="text-destructive text-xs">
              {form.formState.errors.question.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label>Категория</Label>
          <Select
            value={form.watch("category")}
            onValueChange={(value) =>
              form.setValue("category", value as FaqCategory)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="topup">{CATEGORY_LABELS.topup}</SelectItem>
              <SelectItem value="games">{CATEGORY_LABELS.games}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="submit" size="sm" className="gap-1.5" disabled={create.isPending}>
            <Plus className="size-4" aria-hidden />
            Добавить
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-answer">Ответ</Label>
        <Textarea id="new-answer" rows={3} placeholder="Текст ответа" {...form.register("answer")} />
        {form.formState.errors.answer ? (
          <p className="text-destructive text-xs">
            {form.formState.errors.answer.message}
          </p>
        ) : null}
      </div>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </form>
  );
}

/** FAQ constructor: create, edit, hide, reorder (sortOrder) and delete. */
export function FaqManager() {
  const query = useQuery({ queryKey: ["admin-faq"], queryFn: getAdminFaq });

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
        Не удалось загрузить FAQ: {query.error.message}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <NewFaqCard />
      {query.data.map((item) => (
        <FaqCard key={item.id} item={item} />
      ))}
      {query.data.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Вопросов пока нет — добавьте первый выше.
        </p>
      ) : null}
    </div>
  );
}
