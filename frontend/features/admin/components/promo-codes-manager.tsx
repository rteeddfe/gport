"use client";

import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/format";
import { useAdminPromoCodes, useAdminPromoCodeMutations } from "../hooks/use-admin-promo-codes";
import { PromoCodeFormDialog } from "./promo-code-form-dialog";
import type { PromoCode } from "@/types/api";

function discountLabel(promo: PromoCode): string {
  return promo.discountType === "PERCENT"
    ? `−${promo.value}%`
    : `−${formatPrice(promo.value)}`;
}

/** Where the code stands in its lifecycle right now — the isActive flag
 * alone is not enough (a checked code may be expired or used up). */
function runState(promo: PromoCode, now = new Date()): {
  label: string;
  variant: "default" | "secondary" | "destructive";
} {
  if (!promo.isActive) {
    return { label: "Скрыт", variant: "secondary" };
  }
  if (promo.startsAt && new Date(promo.startsAt) > now) {
    return { label: "Запланирован", variant: "secondary" };
  }
  if (promo.endsAt && new Date(promo.endsAt) < now) {
    return { label: "Истёк", variant: "destructive" };
  }
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return { label: "Исчерпан", variant: "destructive" };
  }
  return { label: "Активен", variant: "default" };
}

function PromoRow({ promo, onEdit }: { promo: PromoCode; onEdit: () => void }) {
  const { remove } = useAdminPromoCodeMutations();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError(null);
    try {
      await remove.mutateAsync(promo.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка");
      setConfirmDelete(false);
    }
  }

  const state = runState(promo);

  return (
    <TableRow>
      <TableCell>
        <span className="font-mono font-medium tracking-wider">{promo.code}</span>
      </TableCell>
      <TableCell>{discountLabel(promo)}</TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {promo.minSubtotalCents
          ? `от ${formatPrice(promo.minSubtotalCents)}`
          : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {promo.endsAt
          ? `до ${new Date(promo.endsAt).toLocaleDateString("ru-RU")}`
          : "бессрочно"}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs tabular-nums">
        {promo.usedCount}
        {promo.maxUses !== null ? ` / ${promo.maxUses}` : ""}
      </TableCell>
      <TableCell>
        <Badge variant={state.variant}>{state.label}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Изменить ${promo.code}`}
            onClick={onEdit}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            aria-label={`Удалить ${promo.code}`}
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

/** Admin promo-code table: pagination, row actions, create/edit in a
 * shared dialog. */
export function PromoCodesManager() {
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<
    { mode: "create" } | { mode: "edit"; promo: PromoCode } | null
  >(null);

  const query = useAdminPromoCodes({ page, limit: 10 });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-end">
        <Button className="gap-1.5" onClick={() => setDialog({ mode: "create" })}>
          <Plus className="size-4" aria-hidden />
          Новый промокод
        </Button>
      </div>

      {query.isPending ? (
        <p className="text-muted-foreground text-sm">Загружаем промокоды…</p>
      ) : query.isError ? (
        <p className="text-destructive text-sm">
          Не удалось загрузить промокоды: {query.error.message}
        </p>
      ) : query.data.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Промокодов пока нет — создайте первый.
        </p>
      ) : (
        <>
          <div className="border-border overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Код</TableHead>
                  <TableHead>Скидка</TableHead>
                  <TableHead>Условие</TableHead>
                  <TableHead>Срок</TableHead>
                  <TableHead>Использовано</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-24">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((promo) => (
                  <PromoRow
                    key={promo.id}
                    promo={promo}
                    onEdit={() => setDialog({ mode: "edit", promo })}
                  />
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

      {dialog ? (
        <PromoCodeFormDialog
          key={dialog.mode === "edit" ? dialog.promo.id : "create"}
          promo={dialog.mode === "edit" ? dialog.promo : null}
          open
          onOpenChange={(next) => {
            if (!next) setDialog(null);
          }}
        />
      ) : null}
    </div>
  );
}
