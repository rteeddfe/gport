"use client";

import { Loader2, ShieldBan } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
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
import {
  useTrafficMutations,
  useTrafficStatus,
} from "../hooks/use-admin-traffic";
import type { TrafficSettingsInput } from "@/services/traffic.service";

const banSchema = z.object({
  ip: z
    .string()
    .trim()
    .min(3, "Укажите IP или подсеть")
    .max(45)
    .regex(
      /^(\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?|[0-9A-Fa-f:]{2,45})$/,
      "IP или CIDR-подсеть: 1.2.3.4, 185.220.0.0/16",
    ),
  reason: z.string().trim().max(200),
});

type BanFormValues = z.infer<typeof banSchema>;

const BAN_DURATIONS = [
  { value: "15", label: "15 минут" },
  { value: "60", label: "1 час" },
  { value: "1440", label: "24 часа" },
  { value: "0", label: "Навсегда" },
] as const;

/** «Состояние» → «Трафик и баны»: live per-IP counters (this instance),
 * manual bans (exact IP or IPv4 CIDR) and the auto-ban thresholds. The
 * in-app layer cuts L7 floods; volumetric attacks are the perimeter's
 * job (Cloudflare/DDoS-Guard) — the hint below says so. */
export function TrafficPanel() {
  const query = useTrafficStatus();
  const { ban, unban, updateSettings } = useTrafficMutations();
  const [banFormError, setBanFormError] = useState<string | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const banForm = useForm<BanFormValues>({
    resolver: zodResolver(banSchema),
    defaultValues: { ip: "", reason: "" },
  });
  const [duration, setDuration] = useState("60");

  async function onBan(values: BanFormValues) {
    setBanFormError(null);
    try {
      await ban.mutateAsync({
        ip: values.ip,
        reason: values.reason || null,
        minutes: duration === "0" ? null : Number(duration),
      });
      banForm.reset({ ip: "", reason: "" });
    } catch (cause) {
      setBanFormError(cause instanceof Error ? cause.message : "Ошибка");
    }
  }

  async function onSettingsChange(patch: Partial<TrafficSettingsInput>) {
    const settings = query.data?.settings;
    if (!settings) return;
    setSettingsSaved(false);
    try {
      await updateSettings.mutateAsync({ ...settings, ...patch });
      setSettingsSaved(true);
    } catch {
      // the query refetch restores the server state on error
    }
  }

  if (query.isPending) {
    return <p className="text-muted-foreground text-sm">Загружаем трафик…</p>;
  }
  if (query.isError) {
    return (
      <p className="text-destructive text-sm">
        Не удалось загрузить трафик: {query.error.message}
      </p>
    );
  }

  const { rpsLastMinute, topIps, activeBans, settings } = query.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border-border bg-surface rounded-2xl border p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Запросов за минуту</h3>
            <span className="text-gradient text-2xl font-bold tabular-nums">
              {rpsLastMinute.toLocaleString("ru-RU")}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Счётчики этого инстанса, скользящее окно.
          </p>
        </div>
        <div className="border-border bg-surface rounded-2xl border p-5">
          <h3 className="text-sm font-semibold">Активные баны</h3>
          <p className="text-gradient mt-1 text-2xl font-bold tabular-nums">
            {activeBans.length}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Бан проверки каждого входящего запроса — 403 до всех контроллеров.
          </p>
        </div>
      </div>

      {/* Top-IP table with a per-row ban shortcut. */}
      <div className="border-border overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b text-left">
              <th className="px-4 py-2.5 font-medium">IP</th>
              <th className="px-4 py-2.5 font-medium">Запросов за 5 мин</th>
              <th className="px-4 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {topIps.map((entry) => (
              <tr key={entry.ip} className="border-border border-b last:border-0">
                <td className="px-4 py-2.5 font-mono text-xs">{entry.ip}</td>
                <td className="px-4 py-2.5 tabular-nums">{entry.requests}</td>
                <td className="px-4 py-2.5 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive gap-1.5"
                    onClick={() =>
                      void ban
                        .mutateAsync({ ip: entry.ip, minutes: 60 })
                        .catch(() => null)
                    }
                  >
                    <ShieldBan className="size-4" aria-hidden />
                    Забанить
                  </Button>
                </td>
              </tr>
            ))}
            {topIps.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-muted-foreground px-4 py-4 text-center text-xs">
                  Трафика пока нет.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Manual ban form. */}
      <form
        onSubmit={banForm.handleSubmit(onBan)}
        noValidate
        className="border-border bg-surface grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_auto] sm:items-end"
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="traffic-ban-ip">IP или подсеть</Label>
            <Input id="traffic-ban-ip" placeholder="185.220.0.0/16" {...banForm.register("ip")} />
            {banForm.formState.errors.ip ? (
              <p className="text-destructive text-xs">
                {banForm.formState.errors.ip.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="traffic-ban-reason">Причина (необязательно)</Label>
            <Input id="traffic-ban-reason" placeholder="флуд по заказам" {...banForm.register("reason")} />
          </div>
          <div className="space-y-1.5">
            <Label>Срок</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BAN_DURATIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="submit" variant="outline" className="text-destructive gap-1.5" disabled={ban.isPending}>
          {ban.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ShieldBan className="size-4" aria-hidden />
          )}
          Заблокировать
        </Button>
        {banFormError ? (
          <p className="text-destructive text-xs sm:col-span-2">{banFormError}</p>
        ) : null}
      </form>

      {/* Active bans with unban. */}
      {activeBans.length > 0 ? (
        <div className="space-y-2">
          {activeBans.map((row) => (
            <div
              key={row.id}
              className="border-border bg-surface flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"
            >
              <div>
                <p className="font-mono text-xs font-medium">{row.ip}</p>
                <p className="text-muted-foreground text-xs">
                  {row.reason ?? "без причины"} ·{" "}
                  {row.expiresAt
                    ? `до ${new Date(row.expiresAt).toLocaleString("ru-RU")}`
                    : "навсегда"}{" "}
                  · {row.createdBy}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void unban.mutateAsync(row.id)}
              >
                Разбанить
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Auto-ban thresholds. */}
      <div className="border-border bg-surface space-y-3 rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Авто-бан</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-[#8B5CF6]"
              checked={settings.autoBanEnabled}
              disabled={updateSettings.isPending}
              onChange={(event) => void onSettingsChange({ autoBanEnabled: event.target.checked })}
            />
            включён
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="traffic-threshold">Порог, запросов</Label>
            <Input
              id="traffic-threshold"
              inputMode="numeric"
              defaultValue={settings.banThresholdRequests}
              onBlur={(event) => {
                const value = Number.parseInt(event.target.value, 10);
                if (Number.isInteger(value) && value !== settings.banThresholdRequests) {
                  void onSettingsChange({ banThresholdRequests: value });
                }
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="traffic-window">Окно, секунд</Label>
            <Input
              id="traffic-window"
              inputMode="numeric"
              defaultValue={settings.banWindowSeconds}
              onBlur={(event) => {
                const value = Number.parseInt(event.target.value, 10);
                if (Number.isInteger(value) && value !== settings.banWindowSeconds) {
                  void onSettingsChange({ banWindowSeconds: value });
                }
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="traffic-duration">Бан, минут</Label>
            <Input
              id="traffic-duration"
              inputMode="numeric"
              defaultValue={settings.banDurationMinutes}
              onBlur={(event) => {
                const value = Number.parseInt(event.target.value, 10);
                if (Number.isInteger(value) && value !== settings.banDurationMinutes) {
                  void onSettingsChange({ banDurationMinutes: value });
                }
              }}
            />
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          IP, превысивший порог за окно, банится автоматически на указанный
          срок (0 — навсегда). {settingsSaved ? "Сохранено." : ""}
        </p>
      </div>

      <p className="text-muted-foreground text-xs leading-relaxed">
        Это защита уровня приложения (L7): режет флуд по API, пока сервер
        жив. Объёмную атаку на канал отбивает периметр — перед запуском
        поставьте Cloudflare/DDoS-Guard перед сайтом.
      </p>
    </div>
  );
}
