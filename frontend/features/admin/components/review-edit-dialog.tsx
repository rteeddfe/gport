"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/api/errors";
import { useAdminReviewMutations } from "../hooks/use-admin-reviews";
import { RatingPicker } from "@/features/reviews/components/rating-picker";
import { reviewSchema, type ReviewValues } from "@/schemas/review.schema";
import type { Review } from "@/types/api";

interface ReviewEditDialogProps {
  review: Review;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Admin edit dialog for a review: author name, rating and text. The
 * status is managed by the row actions — this dialog only edits content.
 * The public review schema is reused (name → authorName; an emptied name
 * falls back to «Гость» on the backend). */
export function ReviewEditDialog({ review, open, onOpenChange }: ReviewEditDialogProps) {
  const { update } = useAdminReviewMutations();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: review.rating,
      name: review.authorName === "Гость" ? "" : review.authorName,
      text: review.text,
    },
  });
  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: ReviewValues) {
    setError(null);
    try {
      await update.mutateAsync({
        id: review.id,
        input: {
          authorName: values.name || undefined,
          rating: values.rating,
          text: values.text,
        },
      });
      onOpenChange(false);
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset({
        rating: review.rating,
        name: review.authorName === "Гость" ? "" : review.authorName,
        text: review.text,
      });
      setError(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Редактировать отзыв</DialogTitle>
          <DialogDescription>
            Правки появятся на витрине сразу после сохранения — если отзыв
            опубликован.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label>Оценка</Label>
            <RatingPicker
              value={form.watch("rating")}
              onChange={(value) => form.setValue("rating", value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="review-author">Имя</Label>
            <Input
              id="review-author"
              placeholder="Гость"
              {...form.register("name")}
            />
            <p className="text-muted-foreground text-xs">
              Пусто — на витрине будет «Гость».
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="review-text">Отзыв</Label>
            <Textarea rows={5} id="review-text" {...form.register("text")} />
            {form.formState.errors.text ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.text.message}
              </p>
            ) : null}
          </div>
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              Сохранить
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
            >
              Отмена
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
