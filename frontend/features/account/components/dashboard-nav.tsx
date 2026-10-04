"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { ACCOUNT_NAV_ITEMS } from "../nav";

/** Section switcher of the buyer dashboard: horizontal pills rendered on
 * every account page (the storefront header/footer stay around it). */
export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Личный кабинет" className="flex flex-wrap gap-1">
      {ACCOUNT_NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={
            item.href === pathname || pathname.startsWith(`${item.href}/`)
              ? "page"
              : undefined
          }
          className={cn(
            "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm transition-colors",
            item.href === pathname || pathname.startsWith(`${item.href}/`)
              ? "bg-raised font-medium text-foreground"
              : "text-muted-foreground hover:bg-raised/50 hover:text-foreground",
          )}
        >
          <item.icon
            className={cn(
              "size-4",
              (item.href === pathname ||
                pathname.startsWith(`${item.href}/`)) &&
                "text-brand",
            )}
          />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
