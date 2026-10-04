import {
  Compass,
  Crown,
  Layers,
  Lock,
  ShoppingBag,
  UserCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Container } from "@/components/layout/container";
import { DashboardNav } from "@/features/account/components/dashboard-nav";
import { cn } from "@/lib/utils";

export const metadata = { title: "Достижения" };

interface Achievement {
  icon: LucideIcon;
  name: string;
  description: string;
  xp: number;
  unlocked: boolean;
}

/** Static showcase — no achievements API exists yet. The list, XP values
 * and unlock rules are fish until the backend system is approved. */
const ACHIEVEMENTS: Achievement[] = [
  {
    icon: UserCheck,
    name: "Свой человек",
    description: "Создать аккаунт GPort",
    xp: 50,
    unlocked: true,
  },
  {
    icon: Compass,
    name: "Исследователь",
    description: "Найти страницу, которой не существует",
    xp: 100,
    unlocked: true,
  },
  {
    icon: ShoppingBag,
    name: "Первая покупка",
    description: "Купить первый цифровой товар",
    xp: 200,
    unlocked: false,
  },
  {
    icon: Wallet,
    name: "Заправщик",
    description: "Пополнить игровой сервис",
    xp: 150,
    unlocked: false,
  },
  {
    icon: Layers,
    name: "Коллекционер",
    description: "Совершить 10 покупок",
    xp: 500,
    unlocked: false,
  },
  {
    icon: Crown,
    name: "Легенда GPort",
    description: "Совершить 50 покупок",
    xp: 1000,
    unlocked: false,
  },
];

/** Buyer achievements tab: a playful grid in the 404-achievement language
 * (trophy chips, XP). Placeholder data — wire to a real achievements
 * service when the feature is approved. */
export default function AchievementsPage() {
  const unlockedCount = ACHIEVEMENTS.filter((a) => a.unlocked).length;
  const totalXp = ACHIEVEMENTS.filter((a) => a.unlocked).reduce(
    (sum, a) => sum + a.xp,
    0,
  );

  return (
    <Container>
      <div className="py-10">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon">
            Личный кабинет
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Достижения
          </h1>
        </header>

        <div className="mt-6">
          <DashboardNav />
        </div>

        <p className="text-muted-foreground mt-6 text-sm">
          Открыто {unlockedCount} из {ACHIEVEMENTS.length} ·{" "}
          <span className="text-neon font-mono">+{totalXp} XP</span>
        </p>

        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.map((achievement) => (
            <li
              key={achievement.name}
              className={cn(
                "border-border bg-surface relative overflow-hidden rounded-2xl border p-5",
                achievement.unlocked
                  ? "glow-brand border-brand/40"
                  : "opacity-60",
              )}
            >
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    "grid size-11 place-items-center rounded-xl border",
                    achievement.unlocked
                      ? "border-brand/40 bg-brand/15 text-brand-bright"
                      : "border-border bg-canvas text-muted-foreground",
                  )}
                >
                  <achievement.icon className="size-5" aria-hidden />
                </span>
                {achievement.unlocked ? (
                  <span className="border-neon/40 bg-neon/10 text-neon rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                    Получено
                  </span>
                ) : (
                  <Lock
                    className="text-muted-foreground size-4"
                    aria-label="Заблокировано"
                  />
                )}
              </div>
              <h2 className="mt-4 text-sm font-semibold">{achievement.name}</h2>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {achievement.description}
              </p>
              <p className="text-neon mt-3 font-mono text-xs font-semibold">
                +{achievement.xp} XP
              </p>
            </li>
          ))}
        </ul>

        <p className="text-muted-foreground mt-6 text-xs">
          Пока это витрина: список и правила начисления появятся, когда
          утвердим систему достижений на бэкенде.
        </p>
      </div>
    </Container>
  );
}
