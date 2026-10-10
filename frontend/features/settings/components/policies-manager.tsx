"use client";

import { getErrorMessage } from "@/lib/api/errors";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { revalidateStorefrontTags } from "@/lib/revalidate";
import { policySchema, type PolicyValues } from "@/schemas/policy.schema";
import {
  createPolicy,
  deletePolicy,
  getPolicies,
  getPolicy,
  updatePolicy,
} from "@/services/policies.service";
import type { PolicyPageSummary } from "@/types/api";
import { RichTextEditor } from "./rich-text-editor";

interface SelectedDoc {
  id: string;
  slug: string;
}

function PolicyForm({
  doc,
  onSelected,
}: {
  /** null = creation mode. */
  doc: SelectedDoc | null;
  onSelected: (doc: SelectedDoc | null) => void;
}) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Public read is slug-addressed (GET /policies/:slug); admin writes are
  // id-addressed — the form keeps both.
  const existing = useQuery({
    queryKey: ["policy", doc?.slug],
    queryFn: () => getPolicy(doc!.slug),
    enabled: doc !== null,
  });

  const form = useForm<PolicyValues>({
    resolver: zodResolver(policySchema),
    values: existing.data
      ? {
          slug: existing.data.slug,
          title: existing.data.title,
          content: existing.data.content,
        }
      : { slug: "", title: "", content: "<p></p>" },
  });

  const save = useMutation({
    mutationFn: (values: PolicyValues) =>
      doc === null ? createPolicy(values) : updatePolicy(doc.id, values),
    onSuccess: async (saved) => {
      void revalidateStorefrontTags(["policies"]);
      await queryClient.invalidateQueries({ queryKey: ["admin-policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy", saved.slug] });
      onSelected({ id: saved.id, slug: saved.slug });
      setSavedAt(new Date().toLocaleTimeString("ru-RU"));
    },
    onError: (cause) => setErrorMessage(getErrorMessage(cause)),
  });

  const remove = useMutation({
    mutationFn: () => deletePolicy(doc!.id),
    onSuccess: async () => {
      void revalidateStorefrontTags(["policies"]);
      await queryClient.invalidateQueries({ queryKey: ["admin-policies"] });
      onSelected(null);
    },
    onError: (cause) => setErrorMessage(getErrorMessage(cause)),
  });

  if (doc !== null && existing.isPending) {
    return <Skeleton className="h-72 w-full" />;
  }

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        setErrorMessage(null);
        save.mutate(values);
      })}
      noValidate
      className="space-y-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="policy-slug">Slug (адрес /policies/…)</Label>
          <Input id="policy-slug" placeholder="privacy" {...form.register("slug")} />
          {form.formState.errors.slug ? (
            <p className="text-destructive text-xs">
              {form.formState.errors.slug.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="policy-title">Заголовок документа</Label>
          <Input id="policy-title" {...form.register("title")} />
          {form.formState.errors.title ? (
            <p className="text-destructive text-xs">
              {form.formState.errors.title.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Текст документа</Label>
        <RichTextEditor
          value={form.watch("content")}
          onChange={(html) => form.setValue("content", html)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={save.isPending} className="gap-2">
          {save.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          {doc === null ? "Создать" : "Сохранить"}
        </Button>
        {doc !== null ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive gap-1.5"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm(`Удалить документ «${existing.data?.title}»?`)) {
                remove.mutate();
              }
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Удалить документ
          </Button>
        ) : null}
        {savedAt ? (
          <span className="text-muted-foreground text-xs">
            Сохранено в {savedAt}
          </span>
        ) : null}
        {errorMessage ? (
          <span className="text-destructive text-xs">{errorMessage}</span>
        ) : null}
      </div>
    </form>
  );
}

/** «Юр. информация» tab: the policy list on the left, the full Tiptap
 * editor for the selected document on the right. */
export function PoliciesManager() {
  const list = useQuery({ queryKey: ["admin-policies"], queryFn: getPolicies });
  const [selected, setSelected] = useState<SelectedDoc | null>(null);
  // Selecting a fresh doc after "Новый документ" must keep creation mode.
  const [creating, setCreating] = useState(false);

  if (list.isPending) {
    return <Skeleton className="h-72 w-full" />;
  }
  if (list.isError) {
    return (
      <p className="text-destructive text-sm">
        Не удалось загрузить список: {list.error.message}
      </p>
    );
  }

  const docs: PolicyPageSummary[] = list.data;
  const activeDoc: SelectedDoc | null = creating
    ? null
    : (selected ?? (docs[0]
        ? { id: docs[0].id, slug: docs[0].slug }
        : null));

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => {
            setSelected(null);
            setCreating(true);
          }}
        >
          <Plus className="size-4" aria-hidden />
          Новый документ
        </Button>
        <ul className="space-y-1">
          {docs.map((doc) => (
            <li key={doc.id}>
              <button
                type="button"
                aria-current={
                  !creating && activeDoc?.id === doc.id ? "true" : undefined
                }
                onClick={() => {
                  setSelected({ id: doc.id, slug: doc.slug });
                  setCreating(false);
                }}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  !creating && activeDoc?.id === doc.id
                    ? "bg-raised font-medium text-foreground"
                    : "text-muted-foreground hover:bg-raised/50 hover:text-foreground",
                )}
              >
                {doc.title}
                <span className="text-muted-foreground block text-[11px]">
                  /policies/{doc.slug}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="min-w-0">
        <PolicyForm
          key={activeDoc?.id ?? "new"}
          doc={activeDoc}
          onSelected={(doc) => {
            setSelected(doc);
            setCreating(false);
          }}
        />
      </div>
    </div>
  );
}
