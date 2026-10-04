"use client";

import { ChevronLeft, ChevronRight, Eye, Trash2 } from "lucide-react";
import Link from "next/link";
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
import { useAdminUsers, useAdminUserMutations } from "../hooks/use-admin-users";
import {
  ADMIN_PERMISSION_LABELS,
  ADMIN_PERMISSION_ORDER,
} from "../permissions";
import type { AdminUser } from "@/types/api";

function roleBadgeVariant(role: AdminUser["role"]) {
  if (role === "SUPER_ADMIN") return "default" as const;
  if (role === "ADMIN") return "secondary" as const;
  return "outline" as const;
}

function UserRow({ user }: { user: AdminUser }) {
  const { remove } = useAdminUserMutations();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSuper = user.role === "SUPER_ADMIN";

  async function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError(null);
    try {
      await remove.mutateAsync(user.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка");
      setConfirmDelete(false);
    }
  }

  return (
    <TableRow>
      <TableCell>
        <Link
          href={`/admin/users/${user.id}`}
          className="font-medium hover:text-brand"
        >
          {user.name ?? "Без имени"}
        </Link>
        <p className="text-muted-foreground font-mono text-xs">{user.email}</p>
      </TableCell>
      <TableCell>
        <Badge variant={roleBadgeVariant(user.role)}>{user.role}</Badge>
      </TableCell>
      <TableCell>
        {user.role === "ADMIN" && user.permissions.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {ADMIN_PERMISSION_ORDER.filter((p) => user.permissions.includes(p)).map(
              (p) => (
                <Badge key={p} variant="outline" className="text-[11px]">
                  {ADMIN_PERMISSION_LABELS[p]}
                </Badge>
              ),
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {new Date(user.createdAt).toLocaleDateString("ru-RU")}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={`Открыть ${user.email}`}
          >
            <Link href={`/admin/users/${user.id}`}>
              <Eye className="size-4" aria-hidden />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            aria-label={`Удалить ${user.email}`}
            disabled={isSuper}
            title={isSuper ? "SUPER_ADMIN удалить нельзя" : undefined}
            onClick={onDelete}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
        {confirmDelete && !isSuper && !error ? (
          <p className="text-muted-foreground mt-1 max-w-40 text-xs">
            Нажмите удаление ещё раз для подтверждения.
          </p>
        ) : null}
        {error ? <p className="text-destructive mt-1 text-xs">{error}</p> : null}
      </TableCell>
    </TableRow>
  );
}

/** SUPER_ADMIN user table: accounts, roles, permission badges. Editing
 * (role, permissions, sessions) lives on the detail page. */
export function UsersManager() {
  const [page, setPage] = useState(1);

  const query = useAdminUsers({ page, limit: 10 });

  return (
    <div className="space-y-6">
      {query.isPending ? (
        <p className="text-muted-foreground text-sm">Загружаем пользователей…</p>
      ) : query.isError ? (
        <p className="text-destructive text-sm">
          Не удалось загрузить пользователей: {query.error.message}
        </p>
      ) : query.data.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Пользователи не найдены.</p>
      ) : (
        <>
          <div className="border-border overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Права</TableHead>
                  <TableHead>Создан</TableHead>
                  <TableHead className="w-28">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((user) => (
                  <UserRow key={user.id} user={user} />
                ))}
              </TableBody>
            </Table>
          </div>
          {query.data.pages > 1 ? (
            <nav
              aria-label="Постраничная навигация"
              className="flex items-center justify-center gap-3"
            >
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
