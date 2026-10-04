"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export interface PanelNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Sidebar nav list shared by the admin and account panels: the active
 * route gets the raised pill with a violet icon (same language as the
 * storefront header). */
export function PanelNav({
  items,
  label,
  onNavigate,
}: {
  items: PanelNavItem[];
  label: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          item.href === pathname || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-raised font-medium text-foreground"
                : "text-muted-foreground hover:bg-raised/50 hover:text-foreground",
            )}
          >
            <item.icon className={cn("size-4", active && "text-brand")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
