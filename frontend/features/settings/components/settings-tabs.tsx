"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/** Tabs of the admin «Настройки сайта» section — each tab is its own route
 * (same raised-pill language as the buyer dashboard switcher). */
const TABS = [
  { href: "/admin/settings/general", label: "Основные" },
  { href: "/admin/settings/seo", label: "SEO" },
  { href: "/admin/settings/legal", label: "Юр. информация" },
  { href: "/admin/settings/faq", label: "FAQ" },
  { href: "/admin/settings/home", label: "Главная страница" },
] as const;

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Настройки сайта" className="flex flex-wrap gap-1">
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
