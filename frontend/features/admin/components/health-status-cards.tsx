"use client";

import { Clock, Database, RefreshCw, Server, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHealth } from "@/features/health/hooks/use-health";
import { cn } from "@/lib/utils";

function StatusCard({
  icon: Icon,
  title,
  detail,
  pending,
  ok,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  pending: boolean;
  ok: boolean;
}) {
  return (
    <div className="border-border bg-surface rounded-2xl border p-5">
      <div className="flex items-center justify-between">
        <span className="bg-brand/15 text-brand-bright grid size-9 place-items-center rounded-lg">
          <Icon className="size-4.5" aria-hidden />
        </span>
        {pending ? (
          <Skeleton className="h-5 w-24" />
        ) : (
          <Badge variant={ok ? "secondary" : "destructive"}>
            {ok ? "Доступен" : "Недоступен"}
          </Badge>
        )}
      </div>
      <h2 className="mt-4 text-sm font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
        {detail}
      </p>
    </div>
  );
}

/** Live system health for the admin «Состояние» tab: reads the public
 * GET /health (API reachability + PostgreSQL probe) through the shared
 * useHealth hook — no fake statuses. Refetches on mount/focus and via the
 * manual button. */
export function HealthStatusCards() {
  const { data, isPending, isError, isFetching, refetch } = useHealth();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Источник: GET /health — проверяется автоматически.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw
            className={cn("size-4", isFetching && "animate-spin")}
            aria-hidden
          />
          Проверить снова
        </Button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatusCard
          icon={Server}
          title="API"
          detail="Бэкенд отвечает на запросы"
          pending={isPending}
          ok={!isError && !isPending}
        />
        <StatusCard
          icon={Database}
          title="База данных"
          detail="PostgreSQL через Prisma"
          pending={isPending}
          ok={data?.database === "up"}
        />
        <div className="border-border bg-surface rounded-2xl border p-5">
          <div className="flex items-center justify-between">
            <span className="bg-brand/15 text-brand-bright grid size-9 place-items-center rounded-lg">
              <Clock className="size-4.5" aria-hidden />
            </span>
            {data ? (
              <span className="text-muted-foreground font-mono text-xs">
                {new Date(data.timestamp).toLocaleString("ru-RU")}
              </span>
            ) : (
              <Skeleton className="h-5 w-28" />
            )}
          </div>
          <h2 className="mt-4 text-sm font-semibold">Ответ сервера</h2>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Время сервера на момент проверки
          </p>
        </div>
      </div>
    </div>
  );
}
