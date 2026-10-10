"use client";

import { Plus } from "lucide-react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProductFormValues } from "@/schemas/product.schema";

/**
 * Per-product FAQ of the admin product form — a controlled field of the
 * one shared form (create and edit): Q/A rows with add/remove, saved by
 * the main submit as a wholesale replace (display order = list order).
 * Renders on the product page as an accordion.
 */
export function ProductFaqField({
  form,
}: {
  form: UseFormReturn<ProductFormValues>;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "faq",
  });
  const errors = form.formState.errors.faq;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>FAQ товара</Label>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Вопросы и ответы показываются на странице товара. Сохраняются
            кнопкой формы; пустые строки при сохранении отбрасываются.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={fields.length >= 20}
          onClick={() =>
            append({ id: crypto.randomUUID(), question: "", answer: "" })
          }
        >
          <Plus className="size-4" aria-hidden />
          Добавить вопрос
        </Button>
      </div>

      {errors?.message ? (
        <p className="text-destructive text-xs">{errors.message}</p>
      ) : null}

      {fields.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          Вопросов пока нет — блок на странице не показывается.
        </p>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="border-border bg-canvas/40 rounded-xl border p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Вопрос {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => remove(index)}
                >
                  Удалить
                </Button>
              </div>
              <div className="mt-3 space-y-2">
                <div className="space-y-1">
                  <Input
                    placeholder="Вопрос"
                    aria-label={`Вопрос ${index + 1}`}
                    {...form.register(`faq.${index}.question`)}
                  />
                  {errors?.[index]?.question ? (
                    <p className="text-destructive text-xs">
                      {errors[index]?.question?.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <Textarea
                    rows={2}
                    placeholder="Ответ"
                    aria-label={`Ответ ${index + 1}`}
                    {...form.register(`faq.${index}.answer`)}
                  />
                  {errors?.[index]?.answer ? (
                    <p className="text-destructive text-xs">
                      {errors[index]?.answer?.message}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
