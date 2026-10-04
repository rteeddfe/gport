"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/api/errors";
import { createReview } from "@/services/reviews.service";
import { RatingPicker } from "./rating-picker";
import { reviewSchema, type ReviewValues } from "@/schemas/review.schema";

/**
 * "Оставить отзыв" popup (opened from the homepage carousel and the
 * /reviews page). Submits to POST /reviews — the review lands in PENDING
 * and appears publicly after moderation; the backend rate-limits
 * submissions (1/minute per IP, 40/hour globally) and 429 messages
 * surface here verbatim.
 */
export function ReviewFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5, name: "", text: "" },
  });
  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: ReviewValues) {
    setError(null);
    try {
      await createReview({
        rating: values.rating,
        authorName: values.name || undefined,
        text: values.text,
      });
      setSubmitted(true);
      form.reset();
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset();
      setSubmitted(false);
      setError(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Оставить отзыв</DialogTitle>
          <DialogDescription>
            Поделитесь опытом покупки или пополнения — отзывы помогают другим
            игрокам.
          </DialogDescription>
        </DialogHeader>
        {submitted ? (
          <div className="space-y-4 py-2 text-center">
            <p className="text-neon text-sm font-medium">
              Спасибо! Отзыв отправлен на модерацию.
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              После проверки модератором он появится на этой странице.
            </p>
            <Button type="button" variant="outline" className="w-full" onClick={() => handleOpenChange(false)}>
              Закрыть
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Оценка</FormLabel>
                    <FormControl>
                      <RatingPicker
                        value={field.value}
                        onChange={(value) => field.onChange(value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имя</FormLabel>
                    <FormControl>
                      <Input placeholder="Ваше имя (необязательно)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Отзыв</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Расскажите, что понравилось или что улучшить"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error ? <p className="text-destructive text-xs">{error}</p> : null}
              <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                Отправить отзыв
              </Button>
              <p className="text-muted-foreground text-center text-xs">
                Отзыв публикуется после проверки модератором — не чаще одного
                отзыва в минуту.
              </p>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
