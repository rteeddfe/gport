"use client";

import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
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
import { useAdminPosts, useAdminPostMutations } from "../hooks/use-admin-posts";
import { POST_STATUS_LABELS } from "./post-form";
import type { Post, PostStatus } from "@/types/api";

function statusBadgeVariant(status: PostStatus): "default" | "secondary" {
  return status === "PUBLISHED" ? "default" : "secondary";
}

function PostRow({ post }: { post: Post }) {
  const { remove } = useAdminPostMutations();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError(null);
    try {
      await remove.mutateAsync(post.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка");
      setConfirmDelete(false);
    }
  }

  return (
    <TableRow>
      <TableCell>
        <span className="bg-canvas border-border grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border">
          {post.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.coverImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-gradient text-sm font-bold">{post.title.slice(0, 1)}</span>
          )}
        </span>
      </TableCell>
      <TableCell>
        <Link href={`/admin/blog/${post.id}`} className="font-medium hover:text-brand">
          {post.title}
        </Link>
        <p className="text-muted-foreground font-mono text-xs">{post.slug}</p>
      </TableCell>
      <TableCell>
        <Badge variant={statusBadgeVariant(post.status)}>
          {POST_STATUS_LABELS[post.status]}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {post.publishedAt
          ? new Date(post.publishedAt).toLocaleDateString("ru-RU")
          : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {new Date(post.updatedAt).toLocaleDateString("ru-RU")}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label={`Изменить ${post.title}`}>
            <Link href={`/admin/blog/${post.id}`}>
              <Pencil className="size-4" aria-hidden />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            aria-label={`Удалить ${post.title}`}
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
        {error ? <p className="text-destructive mt-1 text-xs">{error}</p> : null}
      </TableCell>
    </TableRow>
  );
}

/** Admin blog table: status filter, pagination, row actions. Create and
 * edit live on their own pages. */
export function PostsManager() {
  const [status, setStatus] = useState<"ALL" | PostStatus>("ALL");
  const [page, setPage] = useState(1);

  const query = useAdminPosts({
    status: status === "ALL" ? undefined : status,
    page,
    limit: 10,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <Label>Статус</Label>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as "ALL" | PostStatus);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Все статусы</SelectItem>
              <SelectItem value="PUBLISHED">{POST_STATUS_LABELS.PUBLISHED}</SelectItem>
              <SelectItem value="DRAFT">{POST_STATUS_LABELS.DRAFT}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button asChild className="gap-1.5">
          <Link href="/admin/blog/new">
            <Plus className="size-4" aria-hidden />
            Создать новость
          </Link>
        </Button>
      </div>

      {query.isPending ? (
        <p className="text-muted-foreground text-sm">Загружаем новости…</p>
      ) : query.isError ? (
        <p className="text-destructive text-sm">
          Не удалось загрузить новости: {query.error.message}
        </p>
      ) : query.data.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Новости не найдены — измените фильтр или создайте первую новость.
        </p>
      ) : (
        <>
          <div className="border-border overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14" aria-label="Обложка" />
                  <TableHead>Заголовок</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Опубликована</TableHead>
                  <TableHead>Обновлена</TableHead>
                  <TableHead className="w-24">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((post) => (
                  <PostRow key={post.id} post={post} />
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
