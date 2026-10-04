"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LogOut, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/api/errors";
import { useAdminUser, useAdminUserMutations } from "../hooks/use-admin-users";
import {
  ADMIN_PERMISSION_LABELS,
  ADMIN_PERMISSION_ORDER,
} from "../permissions";
import { userAccessSchema, type UserAccessValues } from "@/schemas/user-access.schema";
import type { AdminPermission, AdminUserDetail } from "@/types/api";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-right text-sm">{value}</span>
    </div>
  );
}

/** Role + permission checkboxes. The API replaces the permission set as a
 * whole; permissions are stored for USERs but only apply to ADMINs. */
function UserAccessForm({ user }: { user: AdminUserDetail }) {
  const { update } = useAdminUserMutations();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<UserAccessValues>({
    resolver: zodResolver(userAccessSchema),
    defaultValues: {
      role: user.role === "ADMIN" ? "ADMIN" : "USER",
      permissions: [...user.permissions],
    },
  });
  const role = form.watch("role");
  const permissions = form.watch("permissions");
  const isSubmitting = form.formState.isSubmitting;

  function togglePermission(permission: AdminPermission, checked: boolean) {
    const next = checked
      ? [...permissions, permission]
      : permissions.filter((p) => p !== permission);
    form.setValue("permissions", next, { shouldDirty: true });
    setSaved(false);
  }

  async function onSubmit(values: UserAccessValues) {
    setError(null);
    setSaved(false);
    try {
      await update.mutateAsync({ id: user.id, input: values });
      setSaved(true);
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="border-border bg-surface rounded-2xl border p-6"
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="text-brand size-4" aria-hidden />
        Роль и права
      </h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="user-role">Роль</Label>
          <Select
            value={role}
            onValueChange={(value) => {
              form.setValue("role", value as UserAccessValues["role"], {
                shouldDirty: true,
              });
              setSaved(false);
            }}
          >
            <SelectTrigger id="user-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USER">USER — покупатель</SelectItem>
              <SelectItem value="ADMIN">ADMIN — администратор</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            Назначить SUPER_ADMIN через панель нельзя.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Доступ к вкладкам</Label>
          {ADMIN_PERMISSION_ORDER.map((permission) => (
            <label
              key={permission}
              className="flex cursor-pointer items-center gap-2.5 text-sm"
            >
              <Checkbox
                checked={permissions.includes(permission)}
                disabled={role !== "ADMIN"}
                onCheckedChange={(checked) =>
                  togglePermission(permission, checked === true)
                }
              />
              {ADMIN_PERMISSION_LABELS[permission]}
            </label>
          ))}
          <p className="text-muted-foreground text-xs">
            {role === "ADMIN"
              ? "Права применяются сразу после сохранения."
              : "Права настраиваются заранее и включатся с ролью ADMIN."}
          </p>
        </div>
      </div>
      {error ? (
        <p className="text-destructive mt-4 text-xs">{error}</p>
      ) : null}
      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          Сохранить
        </Button>
        {saved ? (
          <span className="text-brand text-xs">Сохранено</span>
        ) : null}
      </div>
    </form>
  );
}

/** Active sessions (stored refresh tokens) with per-session revocation and
 * a sign-out-everywhere button. */
function UserSessionsCard({ user }: { user: AdminUserDetail }) {
  const { revokeSessions, revokeSession } = useAdminUserMutations();
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onRevokeAll() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setError(null);
    try {
      await revokeSessions.mutateAsync(user.id);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setConfirmReset(false);
    }
  }

  return (
    <div className="border-border bg-surface rounded-2xl border p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">
          Активные сессии{" "}
          <span className="text-muted-foreground font-normal">
            ({user.sessions.length})
          </span>
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={revokeSessions.isPending || user.sessions.length === 0}
          onClick={onRevokeAll}
        >
          {revokeSessions.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <LogOut className="size-4" aria-hidden />
          )}
          {confirmReset ? "Точно сбросить все?" : "Сбросить все сессии"}
        </Button>
      </div>
      {error ? <p className="text-destructive mt-3 text-xs">{error}</p> : null}
      {user.sessions.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-sm">
          Активных сессий нет — пользователь выйдет из аккаунта при следующем
          обновлении токена.
        </p>
      ) : (
        <ul className="divide-border mt-4 divide-y">
          {user.sessions.map((session) => (
            <li
              key={session.id}
              className="flex items-center justify-between gap-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm">
                  Вход:{" "}
                  {new Date(session.createdAt).toLocaleString("ru-RU", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
                <p className="text-muted-foreground text-xs">
                  Действует до:{" "}
                  {new Date(session.expiresAt).toLocaleString("ru-RU", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5"
                disabled={revokeSession.isPending}
                onClick={() => {
                  setError(null);
                  revokeSession.mutate(
                    { id: user.id, sessionId: session.id },
                    {
                      onError: (cause) => setError(getErrorMessage(cause)),
                    },
                  );
                }}
              >
                <LogOut className="size-3.5" aria-hidden />
                Отозвать
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-muted-foreground mt-3 text-xs">
        После сброса доступ закрывается максимум через 15 минут, когда истечёт
        access-токен.
      </p>
    </div>
  );
}

function UserDangerZone({ user }: { user: AdminUserDetail }) {
  const router = useRouter();
  const { remove } = useAdminUserMutations();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError(null);
    try {
      await remove.mutateAsync(user.id);
      router.replace("/admin/users");
    } catch (cause) {
      setError(getErrorMessage(cause));
      setConfirmDelete(false);
    }
  }

  return (
    <div className="border-destructive/40 rounded-2xl border p-6">
      <h2 className="text-destructive text-sm font-semibold">Удаление</h2>
      <p className="text-muted-foreground mt-2 text-sm">
        Аккаунт, его корзина и сессии удалятся безвозвратно.
      </p>
      {error ? <p className="text-destructive mt-3 text-xs">{error}</p> : null}
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="mt-4 gap-2"
        disabled={remove.isPending}
        onClick={onDelete}
      >
        {remove.isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="size-4" aria-hidden />
        )}
        {confirmDelete ? "Точно удалить?" : "Удалить пользователя"}
      </Button>
    </div>
  );
}

/** SUPER_ADMIN view of one account: profile, role/permissions form,
 * sessions and deletion. */
export function UserDetail({ userId }: { userId: string }) {
  const query = useAdminUser(userId);

  if (query.isPending) {
    return <p className="text-muted-foreground text-sm">Загружаем профиль…</p>;
  }
  if (query.isError) {
    return (
      <p className="text-destructive text-sm">
        Не удалось загрузить пользователя: {query.error.message}
      </p>
    );
  }

  const user = query.data;
  const isSuper = user.role === "SUPER_ADMIN";

  return (
    <div className="max-w-4xl space-y-6">
      <div className="border-border bg-surface rounded-2xl border p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold">Профиль</h2>
          <Badge variant={isSuper ? "default" : "secondary"}>{user.role}</Badge>
          {user.role === "ADMIN" ? (
            <span className="text-muted-foreground text-xs">
              {user.permissions.length > 0
                ? user.permissions
                    .map((p) => ADMIN_PERMISSION_LABELS[p])
                    .join(" · ")
                : "права не выданы"}
            </span>
          ) : null}
        </div>
        <div className="mt-3 grid gap-x-10 sm:grid-cols-2">
          <InfoRow label="Email" value={<span className="font-mono">{user.email}</span>} />
          <InfoRow label="Имя" value={user.name ?? "—"} />
          <InfoRow
            label="Создан"
            value={new Date(user.createdAt).toLocaleString("ru-RU", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          />
          <InfoRow
            label="Обновлён"
            value={new Date(user.updatedAt).toLocaleString("ru-RU", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          />
          <InfoRow
            label="ID"
            value={<span className="font-mono text-xs">{user.id}</span>}
          />
        </div>
      </div>

      {isSuper ? (
        <div className="border-border bg-surface rounded-2xl border p-6">
          <h2 className="text-sm font-semibold">Роль и права</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            SUPER_ADMIN имеет полный доступ: роль, права и удаление для этого
            аккаунта недоступны — это защита от полной потери доступа к панели.
          </p>
        </div>
      ) : (
        <UserAccessForm user={user} />
      )}

      <UserSessionsCard user={user} />
      {isSuper ? null : <UserDangerZone user={user} />}
    </div>
  );
}
