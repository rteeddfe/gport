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

import { cookies } from "next/headers";

import { Container } from "@/components/layout/container";
import { DashboardNav } from "@/features/account/components/dashboard-nav";
import { cn } from "@/lib/utils";
import { getMyOrders } from "@/services/orders.service";
import type { OrderView } from "@/types/api";

export const metadata = { title: "Достижения" };

interface Achievement {
  icon: LucideIcon;
  name: string;
  description: string;
  xp: number;
  unlocked: boolean;
}

/** Buyer achievements: unlocked flags are computed from the session's
 * real PAID orders (findMy, capped at 50 — enough for every rule below);
 * «Исследователь» stays a playful always-on chip. */
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
 * (trophy chips, XP), unlocked from the session's real orders. */
export default async function AchievementsPage() {
  const cookieHeader = (await cookies()).toString();
  let orders: OrderView[] = [];
  try {
    orders = await getMyOrders(cookieHeader ? { cookie: cookieHeader } : undefined);
  } catch {
    orders = [];
  }
  const paid = orders.filter((order) => order.status === "PAID");
  const paidCount = paid.length;
  const hasTopup = paid.some((order) =>
    order.items.some((item) => item.accountIdentifier !== null),
  );

  const unlocked = new Set<string>(["Свой человек", "Исследователь"]);
  if (paidCount >= 1) unlocked.add("Первая покупка");
  if (hasTopup) unlocked.add("Заправщик");
  if (paidCount >= 10) unlocked.add("Коллекционер");
  if (paidCount >= 50) unlocked.add("Легенда GPort");

  const achievements = ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: unlocked.has(achievement.name),
  }));
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalXp = achievements
    .filter((a) => a.unlocked)
    .reduce((sum, a) => sum + a.xp, 0);

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
          {achievements.map((achievement) => (
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
