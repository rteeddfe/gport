import { Trophy } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/** The «Достижение» 404 card (variant picked 2026-10-04 from five demos):
 * glowing trophy, «Достижение разблокировано» kicker, a playful XP bar
 * and the recovery buttons. Shared by the root `app/not-found.tsx` (which
 * renders its own chrome for URLs matching no route group) and
 * `app/(public)/not-found.tsx` (where the group layout provides it). */
export function NotFoundCard() {
  return (
    <div className="border-border bg-surface relative mx-auto max-w-xl overflow-hidden rounded-3xl border p-8 text-center sm:p-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(26rem_14rem_at_50%_0%,rgb(139_92_246/0.16),transparent_70%),radial-gradient(20rem_12rem_at_85%_100%,rgb(85_221_229/0.1),transparent_70%)]"
      />
      <div className="relative">
        <div className="glow-brand border-brand/40 bg-brand/15 mx-auto grid size-16 place-items-center rounded-2xl border">
          <Trophy className="text-brand size-8" aria-hidden />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-neon">
          Достижение разблокировано
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Такой страницы <span className="text-gradient">нет</span>
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          Вы нашли страницу, которой нет. Опыт за любопытство начислен —
          проверьте адрес или вернитесь к играм.
        </p>
        <div className="mt-6 text-left">
          <div className="text-muted-foreground flex items-center justify-between font-mono text-[11px]">
            <span>Прогресс исследования</span>
            <span>67%</span>
          </div>
          <div className="bg-canvas mt-1.5 h-1.5 overflow-hidden rounded-full">
            <div className="from-brand to-neon h-full w-[67%] rounded-full bg-gradient-to-r" />
          </div>
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="h-12 rounded-xl px-7 text-base">
            <Link href="/">На главную</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-7 text-base">
            <Link href="/products">В каталог игр</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
