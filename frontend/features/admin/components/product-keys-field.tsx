"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  adminGetProductKeys,
  adminReplaceProductKeys,
} from "@/services/products.service";

/**
 * Auto-delivery keys of a product (edit mode only): one key per line.
 * Saving replaces the UNSOLD keys; already-sold keys are purchase history
 * and stay. On payment the orders backend assigns keys automatically —
 * that's the «автовыдача». The textarea is uncontrolled and remounts from
 * fresh data via its key (no state syncing).
 */
export function ProductKeysField({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-product-keys", productId],
    queryFn: () => adminGetProductKeys(productId),
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      adminReplaceProductKeys(
        productId,
        (textareaRef.current?.value ?? "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      ),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({
        queryKey: ["admin-product-keys", productId],
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
        Не удалось загрузить ключи: {query.error.message}
      </p>
    );
  }

  const available = query.data.keys.filter((key) => !key.isSold);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label htmlFor="product-keys">Ключи автовыдачи</Label>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            По одному ключу на строку. После оплаты ключ уходит покупателю
            автоматически; проданные ключи не трогаются.
          </p>
        </div>
        <p className="text-muted-foreground shrink-0 text-xs tabular-nums">
          Свободно: {query.data.available} · Продано: {query.data.sold}
        </p>
      </div>
      <Textarea
        key={query.data.keys.map((key) => key.id).join(",")}
        ref={textareaRef}
        id="product-keys"
        rows={4}
        className="font-mono text-xs"
        placeholder={"KEY-AAAA-BBBB-CCCC\nKEY-DDDD-EEEE-FFFF"}
        defaultValue={available.map((key) => key.value).join("\n")}
      />
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
          Сохранить ключи
        </Button>
        {saved ? (
          <p className="text-muted-foreground text-xs">Сохранено</p>
        ) : null}
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
      </div>
    </section>
  );
}
