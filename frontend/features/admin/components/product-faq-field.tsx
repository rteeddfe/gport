"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  adminGetProductFaq,
  adminReplaceProductFaq,
} from "@/services/products.service";
import type { ProductFaqItem } from "@/types/api";

interface FaqRow {
  /** Client-side identity of the editable row (index keys lose input
   * state when a middle row is removed). */
  id: string;
  question: string;
  answer: string;
}

/**
 * Per-product FAQ of the admin product form (edit mode only): Q/A rows
 * with add/remove; saving replaces the whole list — display order equals
 * the list order. Renders on the product page as an accordion.
 */
export function ProductFaqField({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-product-faq", productId],
    queryFn: () => adminGetProductFaq(productId),
  });

  const [rows, setRows] = useState<FaqRow[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value: FaqRow[] =
    rows ??
    query.data?.map((item) => ({
      id: item.id,
      question: item.question,
      answer: item.answer,
    })) ??
    [];

  const save = useMutation({
    // The wire payload stays {question, answer} — row ids are client-side
    // React keys only.
    mutationFn: () =>
      adminReplaceProductFaq(
        productId,
        value.map(({ question, answer }) => ({ question, answer })),
      ),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({
        queryKey: ["admin-product-faq", productId],
      });
    },
    onError: (cause) =>
      setError(cause instanceof Error ? cause.message : "Ошибка"),
  });

  if (query.isPending) {
    return null;
  }
  if (query.isError) {
    return (
      <p className="text-destructive text-xs">
        Не удалось загрузить FAQ: {query.error.message}
      </p>
    );
  }

  function updateRow(index: number, patch: Partial<FaqRow>) {
    setRows(
      value.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
    setSaved(false);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>FAQ товара</Label>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Вопросы и ответы показываются на странице товара. Пустые строки
            при сохранении отбрасываются.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={value.length >= 20}
          onClick={() => {
            setRows([
              ...value,
              { id: crypto.randomUUID(), question: "", answer: "" },
            ]);
            setSaved(false);
          }}
        >
          <Plus className="size-4" aria-hidden />
          Добавить вопрос
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          Вопросов пока нет — блок на странице не показывается.
        </p>
      ) : (
        <div className="space-y-3">
          {value.map((row, index) => (
            <div
              key={row.id}
              className="border-border bg-canvas/40 rounded-xl border p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Вопрос {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    setRows(value.filter((_, i) => i !== index));
                    setSaved(false);
                  }}
                >
                  Удалить
                </Button>
              </div>
              <div className="mt-3 space-y-2">
                <Input
                  placeholder="Вопрос"
                  value={row.question}
                  onChange={(event) =>
                    updateRow(index, { question: event.target.value })
                  }
                />
                <Textarea
                  rows={2}
                  placeholder="Ответ"
                  value={row.answer}
                  onChange={(event) =>
                    updateRow(index, { answer: event.target.value })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={save.isPending}
          onClick={() => {
            setSaved(false);
            setError(null);
            save.mutate();
          }}
          className="gap-2"
        >
          {save.isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : null}
          Сохранить FAQ
        </Button>
        {saved ? (
          <p className="text-muted-foreground text-xs">Сохранено</p>
        ) : null}
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
      </div>
    </section>
  );
}
