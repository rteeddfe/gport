import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { DashboardNav } from "@/features/account/components/dashboard-nav";
import { ACCOUNT_NAV_ITEMS } from "@/features/account/nav";

export const metadata = { title: "Обзор" };

/** Buyer overview inside the storefront chrome: section cards over real
 * entities only. No fake order stats — the orders backend does not exist
 * until the purchase flow is approved. */
export default function DashboardPage() {
  const sections = ACCOUNT_NAV_ITEMS.filter((item) => item.href !== "/dashboard");

  return (
    <Container>
      <div className="py-10">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon">
            Личный кабинет
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Обзор
          </h1>
        </header>

        <div className="mt-6">
          <DashboardNav />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {sections.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="border-border bg-surface hover:border-brand/50 hover:glow-brand group flex flex-col rounded-2xl border p-5 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="bg-brand/15 text-brand-bright grid size-9 place-items-center rounded-lg">
                  <item.icon className="size-4.5" />
                </span>
                <ArrowUpRight className="text-muted-foreground group-hover:text-foreground size-4 transition-colors" />
              </div>
              <h2 className="mt-4 text-sm font-semibold">{item.label}</h2>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </Container>
  );
}
