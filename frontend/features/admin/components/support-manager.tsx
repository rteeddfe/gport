"use client";

import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
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
import { formatDateTime } from "@/lib/format";
import { useAdminTickets, useAdminTicketMutations } from "../hooks/use-admin-support";
import type { AdminSupportTicketView, SupportTicketStatus } from "@/types/api";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "Все статусы" },
  { value: "NEW", label: "Новые" },
  { value: "IN_PROGRESS", label: "В работе" },
  { value: "RESOLVED", label: "Решены" },
];

const STATUS_META: Record<
  SupportTicketStatus,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  NEW: { label: "Новый", variant: "default" },
  IN_PROGRESS: { label: "В работе", variant: "secondary" },
  RESOLVED: { label: "Решён", variant: "destructive" },
};

function TicketRow({ ticket }: { ticket: AdminSupportTicketView }) {
  const { update, remove } = useAdminTicketMutations();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(status: SupportTicketStatus) {
    setError(null);
    try {
      await update.mutateAsync({ id: ticket.id, status });
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
      await remove.mutateAsync(ticket.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка");
      setConfirmDelete(false);
    }
  }

  const statusMeta = STATUS_META[ticket.status];

  return (
    <TableRow>
      <TableCell>
        <div className="min-w-40">
          <p className="text-sm font-medium">{ticket.name || "Гость"}</p>
          <p className="text-muted-foreground font-mono text-xs">{ticket.contact}</p>
          <p
            className="text-muted-foreground font-mono text-[11px]"
            title={ticket.ip ?? undefined}
          >
            {ticket.ip ?? "ip скрыт"}
          </p>
        </div>
      </TableCell>
      <TableCell className="max-w-96">
        <p className="line-clamp-3 text-sm whitespace-pre-line">{ticket.message}</p>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
        {formatDateTime(ticket.createdAt)}
      </TableCell>
      <TableCell>
        <Select value={ticket.status} onValueChange={(value) => changeStatus(value as SupportTicketStatus)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_META) as SupportTicketStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_META[status].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant={statusMeta.variant} className="sr-only">
          {statusMeta.label}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-2">
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
          <Button
            type="button"
            variant={confirmDelete ? "destructive" : "ghost"}
            size="sm"
            onClick={onDelete}
            onBlur={() => setConfirmDelete(false)}
            aria-label="Удалить обращение"
          >
            <Trash2 className="size-4" aria-hidden />
            {confirmDelete ? "Точно?" : ""}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

/** Support inbox for the admin «Обращения» tab: status filter, pagination,
 * per-row status pipeline and a two-step delete for spam. */
export function SupportManager() {
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);

  const query = useAdminTickets({
    page,
    limit: 20,
    ...(status === "ALL" ? {} : { status: status as SupportTicketStatus }),
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
            {STATUS_FILTERS.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-sm">
          {query.data ? `${query.data.total} всего` : ""}
        </p>
      </div>

      {query.isPending ? (
        <p className="text-muted-foreground mt-6 text-sm">Загрузка…</p>
      ) : query.isError ? (
        <p className="text-destructive mt-6 text-sm">{query.error.message}</p>
      ) : query.data.items.length === 0 ? (
        <p className="text-muted-foreground mt-6 text-sm">Обращений пока нет.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Контакт</TableHead>
                <TableHead>Сообщение</TableHead>
                <TableHead>Получено</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {query.data && query.data.pages > 1 ? (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            <ChevronLeft className="size-4" aria-hidden />
            Назад
          </Button>
          <span className="text-muted-foreground text-xs">
            {page} / {query.data.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= query.data.pages}
            onClick={() => setPage((value) => value + 1)}
          >
            Вперёд
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
