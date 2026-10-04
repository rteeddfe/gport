"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { useMe } from "@/features/auth/hooks/use-me";
import { ADMIN_NAV_ITEMS } from "../nav";
import { visibleAdminNavItems } from "../permissions";

/** Overview section cards, filtered by the session's role and permissions
 * (same subset as the sidebar). Client component because the filter needs
 * the live /auth/me profile. */
export function OverviewSections() {
  const { data: user } = useMe();
  if (!user) {
    return null;
  }
  const sections = visibleAdminNavItems(user, ADMIN_NAV_ITEMS).filter(
    (item) => item.href !== "/admin",
  );

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
  );
}
