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
import { Textarea } from "@/components/ui/textarea";
import { useAdminPostMutations } from "../hooks/use-admin-posts";
import { PostCoverField } from "./post-cover-field";
import { postSchema, type PostFormValues } from "@/schemas/post.schema";
import type { Post } from "@/types/api";

export const POST_STATUS_LABELS = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликован",
} as const;

function formValuesFrom(post: Post): PostFormValues {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    coverImageUrl: post.coverImageUrl ?? "",
    status: post.status,
  };
}

const EMPTY_VALUES: PostFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImageUrl: "",
  status: "DRAFT",
};

interface PostFormProps {
  /** Absent on the create page. */
  post?: Post;
}

/** Admin create/edit post form. An empty slug is generated from the title
 * on the backend; publishing stamps publishedAt on the first publish. */
export function PostForm({ post }: PostFormProps) {
  const router = useRouter();
  const { create, update } = useAdminPostMutations();
  const [error, setError] = useState<string | null>(null);
  const editMode = post !== undefined;

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: post ? formValuesFrom(post) : EMPTY_VALUES,
  });
  const errors = form.formState.errors;

  async function onSubmit(values: PostFormValues) {
    setError(null);
    const input = {
      title: values.title,
      slug: values.slug || undefined,
      excerpt: values.excerpt.trim() || undefined,
      content: values.content.trim() || undefined,
      coverImageUrl: values.coverImageUrl || null,
      status: values.status,
    };
    try {
      if (editMode && post) {
        await update.mutateAsync({ id: post.id, input });
      } else {
        await create.mutateAsync(input);
      }
      router.push("/admin/posts");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="title">Заголовок</Label>
          <Input
            id="title"
            placeholder="Осенние скидки на хиты"
            {...form.register("title")}
          />
          {errors.title ? (
            <p className="text-destructive text-xs">{errors.title.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug (URL)</Label>
          <Input id="slug" placeholder="skidki-na-osennie-hity" {...form.register("slug")} />
          {errors.slug ? (
            <p className="text-destructive text-xs">{errors.slug.message}</p>
          ) : null}
          <p className="text-muted-foreground text-xs">
            Пусто — сгенерируется из заголовка. Адрес новости: /blog/&lt;slug&gt;
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Статус</Label>
          <Select
            value={form.watch("status")}
            onValueChange={(value) =>
              form.setValue("status", value as PostFormValues["status"])
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(POST_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            На витрине виден только «Опубликован». Дата публикации ставится
            автоматически при первой публикации.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Обложка</Label>
          <PostCoverField
            value={form.watch("coverImageUrl") || null}
            onChange={(url) => form.setValue("coverImageUrl", url ?? "")}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="excerpt">Краткое описание</Label>
          <Textarea
            id="excerpt"
            rows={2}
            placeholder="Одно-два предложения для карточки в списке новостей"
            {...form.register("excerpt")}
          />
          {errors.excerpt ? (
            <p className="text-destructive text-xs">{errors.excerpt.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="content">Текст новости</Label>
          <Textarea
            id="content"
            rows={14}
            placeholder="Текст новости. Абзацы разделяйте переносом строки."
            {...form.register("content")}
          />
          {errors.content ? (
            <p className="text-destructive text-xs">{errors.content.message}</p>
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
          {editMode ? "Сохранить" : "Создать новость"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/admin/blog">Отмена</Link>
        </Button>
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
      </div>
    </form>
  );
}
