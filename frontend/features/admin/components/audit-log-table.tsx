"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminAuditLogs } from "@/features/admin/hooks/use-admin-audit-logs";
import { getErrorMessage } from "@/lib/api/errors";
import type { AuditLogsQueryParams } from "@/types/api";

/**
 * SUPER_ADMIN audit log (M-AUDIT-1): read-only table with filters and
 * pagination. Metadata is rendered as plain text (no dangerouslySetInnerHTML)
 * — the server already sanitized it, the rendering stays text-only too.
 */
export function AuditLogTable() {
  const [filters, setFilters] = useState<AuditLogsQueryParams>({});
  const [page, setPage] = useState(1);
  const query = useAdminAuditLogs({ page, limit: 20, ...filters });

  if (query.isPending) {
    return <p className="text-muted-foreground text-sm">Загрузка…</p>;
  }
  if (query.isError) {
    return (
      <p className="text-destructive text-sm">
        Не удалось загрузить журнал: {getErrorMessage(query.error)}
      </p>
    );
  }

  const data = query.data;
  const pages = Math.max(1, data.pages);

  return (
    <div className="space-y-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
        }}
        noValidate
        className="flex flex-wrap items-end gap-3"
      >
        <div className="space-y-1.5">
          <Label htmlFor="audit-action">Действие</Label>
          <Input
            id="audit-action"
            value={filters.action ?? ""}
            onChange={(event) =>
              setFilters({ ...filters, action: event.target.value || undefined, page: 1 })
            }
            placeholder="integration.updated"
            className="w-56"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-entity-type">Тип сущности</Label>
          <select
            aria-label="Тип сущности"
            value={filters.entityType ?? ""}
            onChange={(event) =>
              setFilters({
                ...filters,
                page: 1,
                entityType: event.target.value || undefined,
              })
            }
            className="border-border bg-surface rounded-md border px-2 py-2 text-sm"
          >
            <option value="">Все</option>
            <option value="integration">integration</option>
            <option value="user">user</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-actor">Actor (UUID)</Label>
          <Input
            id="audit-actor"
            value={filters.actorUserId ?? ""}
            onChange={(event) =>
              setFilters({ ...filters, actorUserId: event.target.value || undefined, page: 1 })
            }
            placeholder="uuid"
            className="w-72"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-date-from">С даты</Label>
          <Input
            id="audit-date-from"
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(event) =>
              setFilters({ ...filters, dateFrom: event.target.value || undefined, page: 1 })
            }
            className="w-36"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-date-to">По дату</Label>
          <Input
            id="audit-date-to"
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(event) =>
              setFilters({ ...filters, dateTo: event.target.value || undefined, page: 1 })
            }
            className="w-40"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="mt-5">
          Применить
        </Button>
      </form>

      <div className="border-border overflow-hidden rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Время</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Действие</TableHead>
              <TableHead>Сущность</TableHead>
              <TableHead>Metadata</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground text-sm">
                  Записей нет.
                </TableCell>
              </TableRow>
            ) : (
              query.data.items.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleString("ru-RU")}
                  </TableCell>
                  <TableCell className="text-xs">
                    {entry.actorUserId ? (
                      <span
                        title={`${entry.actorUserId} · ${entry.actorRole ?? "—"}`}
                        className="font-mono text-[11px]"
                      >
                        {entry.actorUserId.slice(0, 8)}…
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{entry.action}</TableCell>
                  <TableCell className="text-xs">
                    {entry.entityType}
                    {entry.entityId ? ` · ${entry.entityId}` : ""}
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-mono text-[11px]">
                    {entry.metadata ? JSON.stringify(entry.metadata) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {entry.ipAddress ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, page - 1))}
        >
          Назад
        </Button>
        <span className="text-muted-foreground text-xs">
          Страница {data.page} из {pages} · всего {data.total}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => setPage((current) => current + 1)}
        >
          Дальше
        </Button>
      </div>
    </div>
  );
}

