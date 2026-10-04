"use client";

import { Check, ChevronLeft, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Stars } from "@/features/reviews/components/stars";
import { useAdminReviews, useAdminReviewMutations } from "../hooks/use-admin-reviews";
import { ReviewEditDialog } from "./review-edit-dialog";
import type { Review, ReviewStatus } from "@/types/api";

export const REVIEW_STATUS_LABELS = {
  PENDING: "На модерации",
  PUBLISHED: "Опубликован",
  REJECTED: "Отклонён",
} as const;

function statusBadgeVariant(status: ReviewStatus): "secondary" | "default" | "destructive" {
  if (status === "PUBLISHED") return "default";
  if (status === "REJECTED") return "destructive";
  return "secondary";
}

function ReviewRow({ review }: { review: Review }) {
  const { update, remove } = useAdminReviewMutations();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPublish() {
    setError(null);
    try {
      await update.mutateAsync({ id: review.id, input: { status: "PUBLISHED" } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка");
    }
  }

  async function onReject() {
    setError(null);
    try {
      await update.mutateAsync({ id: review.id, input: { status: "REJECTED" } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка");
    }
  }

  async function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError(null);
    try {
      await remove.mutateAsync(review.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка");
      setConfirmDelete(false);
    }
  }

  const busy = update.isPending || remove.isPending;

  return (
    <TableRow>
      <TableCell>
        <div className="min-w-32">
          <p className="text-sm font-medium">{review.authorName}</p>
          <Stars rating={review.rating} className="mt-1" />
        </div>
      </TableCell>
      <TableCell className="max-w-96">
        {/* Full text on hover — the cell itself is clamped to two lines. */}
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="line-clamp-2 cursor-default text-left text-sm leading-relaxed text-foreground/85">
                {review.text}
              </p>
            </TooltipTrigger>
            <TooltipContent className="max-w-96 text-sm leading-relaxed">
              {review.text}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell>
        <Badge variant={statusBadgeVariant(review.status)}>
          {REVIEW_STATUS_LABELS[review.status]}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {new Date(review.createdAt).toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            disabled={busy}
            aria-label={`Редактировать отзыв ${review.authorName}`}
            title="Редактировать"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
          {review.status !== "PUBLISHED" ? (
            <Button
              variant="ghost"
              size="icon"
              disabled={busy}
              aria-label={`Опубликовать отзыв ${review.authorName}`}
              title="Опубликовать"
              onClick={onPublish}
            >
              <Check className="size-4" aria-hidden />
            </Button>
          ) : null}
          {review.status !== "REJECTED" ? (
            <Button
              variant="ghost"
              size="icon"
              disabled={busy}
              aria-label={`Отклонить отзыв ${review.authorName}`}
              title="Отклонить"
              onClick={onReject}
            >
              <X className="size-4" aria-hidden />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            disabled={busy}
            aria-label={`Удалить отзыв ${review.authorName}`}
            onClick={onDelete}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
        {confirmDelete && !error ? (
          <p className="text-muted-foreground mt-1 max-w-40 text-xs">
            Нажмите удаление ещё раз для подтверждения.
          </p>
        ) : null}
        {error ? <p className="text-destructive mt-1 max-w-40 text-xs">{error}</p> : null}
        <ReviewEditDialog review={review} open={editing} onOpenChange={setEditing} />
      </TableCell>
    </TableRow>
  );
}

/** Admin moderation queue: every review (all statuses) with a status
 * filter, pagination and inline publish/reject/delete actions. */
export function ReviewsManager() {
  const [status, setStatus] = useState<"ALL" | ReviewStatus>("ALL");
  const [page, setPage] = useState(1);

  const query = useAdminReviews({
    status: status === "ALL" ? undefined : status,
    page,
    limit: 10,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Статус</Label>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as "ALL" | ReviewStatus);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Все отзывы</SelectItem>
              <SelectItem value="PENDING">{REVIEW_STATUS_LABELS.PENDING}</SelectItem>
              <SelectItem value="PUBLISHED">{REVIEW_STATUS_LABELS.PUBLISHED}</SelectItem>
              <SelectItem value="REJECTED">{REVIEW_STATUS_LABELS.REJECTED}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {query.isPending ? (
        <p className="text-muted-foreground text-sm">Загружаем отзывы…</p>
      ) : query.isError ? (
        <p className="text-destructive text-sm">
          Не удалось загрузить отзывы: {query.error.message}
        </p>
      ) : query.data.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Отзывы не найдены — измените фильтр.
        </p>
      ) : (
        <>
          <div className="border-border overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Автор</TableHead>
                  <TableHead>Отзыв</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Написан</TableHead>
                  <TableHead className="w-36">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((review) => (
                  <ReviewRow key={review.id} review={review} />
                ))}
              </TableBody>
            </Table>
          </div>
          {query.data.pages > 1 ? (
            <nav aria-label="Постраничная навигация" className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft aria-hidden />
                Назад
              </Button>
              <span className="text-muted-foreground text-sm tabular-nums">
                {page} из {query.data.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= query.data.pages}
                onClick={() => setPage((current) => current + 1)}
              >
                Вперёд
                <ChevronRight aria-hidden />
              </Button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
