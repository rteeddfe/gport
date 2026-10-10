"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/** Tabs of the admin «Категории» section — route-based like the settings
 * tabs (same raised-pill language). */
const TABS = [
  { href: "/admin/categories", label: "Категории" },
  { href: "/admin/categories/lists", label: "Списки" },
] as const;

export function CategoriesTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Категории" className="flex flex-wrap gap-1">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm transition-colors",
              active
                ? "bg-raised font-medium text-foreground"
                : "text-muted-foreground hover:bg-raised/50 hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
