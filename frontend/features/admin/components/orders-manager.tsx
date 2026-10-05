"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { formatDateTime, formatPrice } from "@/lib/format";
import { ORDER_STATUS_META, PROVIDER_LABELS } from "@/lib/order-labels";
import { useAdminOrders } from "../hooks/use-admin-orders";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "Все статусы" },
  { value: "AWAITING_PAYMENT", label: "Ожидают оплаты" },
  { value: "PAID", label: "Оплачены" },
  { value: "CANCELLED", label: "Отменены" },
];

/** Buyer orders table for the admin panel: status filter, pagination and
 * the essentials (client, composition, total, state). Keys live in the
 * buyer's profile — the admin opens a specific user when needed. */
export function OrdersManager() {
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);

  const query = useAdminOrders({
    page,
    limit: 20,
    ...(status === "ALL" ? {} : { status }),
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {query.data ? (
          <p className="text-muted-foreground text-xs">
            Всего: {query.data.total}
          </p>
        ) : null}
      </div>

      {query.isPending ? (
        <p className="text-muted-foreground mt-6 text-sm">Загрузка…</p>
      ) : query.isError ? (
        <p className="text-destructive mt-6 text-sm">
          Не удалось загрузить заказы: {query.error.message}
        </p>
      ) : query.data.items.length === 0 ? (
        <p className="text-muted-foreground mt-6 text-sm">
          Заказов пока нет — оформите тестовую покупку из карточки товара.
        </p>
      ) : (
        <>
          <div className="border-border mt-4 overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>№</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Покупатель</TableHead>
                  <TableHead>Состав</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Оплата</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((order) => {
                  const statusMeta = ORDER_STATUS_META[order.status];
                  const first = order.items[0];
                  const composition =
                    (first?.productTitle ?? "—") +
                    (first?.variantLabel ? ` (${first.variantLabel})` : "") +
                    (order.items.length > 1 ? ` +${order.items.length - 1}` : "");
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDateTime(order.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <p className="font-medium">{order.userName ?? "—"}</p>
                        <p className="text-muted-foreground">{order.userEmail}</p>
                      </TableCell>
                      <TableCell className="max-w-56 text-xs">
                        <p className="truncate">{composition}</p>
                        {first?.accountIdentifier ? (
                          <p
                            className="text-muted-foreground truncate font-mono"
                            title={`Аккаунт: ${first.accountIdentifier}`}
                          >
                            → {first.accountIdentifier}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs font-semibold whitespace-nowrap tabular-nums">
                        {formatPrice(order.totalCents)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {PROVIDER_LABELS[order.provider] ?? order.provider}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusMeta.variant}>
                          {statusMeta.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {query.data.pages > 1 ? (
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                aria-label="Предыдущая страница"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </Button>
              <span className="text-muted-foreground text-xs">
                {page} / {query.data.pages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={page >= query.data.pages}
                onClick={() => setPage((current) => current + 1)}
                aria-label="Следующая страница"
              >
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
