"use client";

import { Menu, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { headerIcon } from "@/lib/header-icons";
import { cn } from "@/lib/utils";
import type { HeaderMenuItem } from "@/types/api";
import { InstallBanner } from "@/features/pwa/components/install-banner";
import { useUiStore } from "@/stores/ui-store";
import { AuthButton } from "./auth-button";
import { SearchDialog } from "./search-dialog";

function navItemClass(active: boolean): string {
  return cn(
    "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm transition-colors",
    active
      ? "bg-raised/80 font-medium text-foreground"
      : "text-muted-foreground hover:bg-raised/50 hover:text-foreground",
  );
}

function NavItems({ items }: { items: HeaderMenuItem[] }) {
  const pathname = usePathname();
  // Admin-saved rows may have an empty link/label — an empty href would
  // render an <a href=""> and warn in the console.
  const visible = items.filter((item) => item.href && item.label);
  return (
    <>
      {visible.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = headerIcon(item.icon);
        return (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={navItemClass(active)}
          >
            <Icon className={cn("size-4", active && "text-brand")} />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

/** Floating-capsule header (docs/design.md — variant 5), FIXED to the
 * viewport: every layout that renders it offsets its content by the
 * header height (pt-20 = pt-4 + h-16). Logo, name, descriptor and the
 * menu come from the admin site settings (SiteHeader fetches them
 * server-side); anything empty simply does not render. `hasSession` is
 * the cookie-presence hint from the server — the auth widget renders in
 * its final state with the page instead of checking after load. */
export function Header({
  logoUrl = "",
  siteName = "",
  descriptor = "",
  menu = [],
  hasSession = false,
}: {
  logoUrl?: string;
  siteName?: string;
  descriptor?: string;
  menu?: HeaderMenuItem[];
  hasSession?: boolean;
} = {}) {
  const isMobileMenuOpen = useUiStore((state) => state.isMobileMenuOpen);
  const setMobileMenuOpen = useUiStore((state) => state.setMobileMenuOpen);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 px-4 pt-4">
      {/* Smart app banner (iPhone / Android) rides along with the capsule. */}
      <div className="mx-auto max-w-[1200px] 2xl:max-w-[1568px]">
        <InstallBanner />
      </div>
      <div className="glass border-border/70 pointer-events-auto relative mx-auto flex h-16 max-w-[1200px] 2xl:max-w-[1568px] items-center gap-6 rounded-2xl border px-5 shadow-[0_10px_50px_-14px_rgba(139,92,246,0.45)]">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          {/* The settings-driven source may be an uploaded SVG (/files/:id)
              — the optimizer skips SVGs, raster logos get optimized and
              preloaded (first screen of every page). No logo configured —
              no image rendered (the brand fills from the admin). */}
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={siteName}
              width={65}
              height={45}
              priority
              unoptimized={logoUrl.toLowerCase().endsWith(".svg")}
              className="h-[45px] w-[65px] object-contain"
            />
          ) : null}
          {/* Clamped to ~two words per line so the tagline reads as a
              compact two-line stack next to the logo. */}
          {descriptor ? (
            <span className="text-muted-foreground hidden max-w-28 text-[11px] leading-tight lg:block">
              {descriptor}
            </span>
          ) : null}
        </Link>

        {menu.length > 0 ? (
          <nav className="hidden items-center gap-1 md:flex">
            <NavItems items={menu} />
          </nav>
        ) : null}

        <div className="ml-auto flex items-center gap-2.5">
          <button
            type="button"
            aria-label="Поиск"
            onClick={() => setSearchOpen(true)}
            className="grid size-10 place-items-center rounded-full border border-border/60 bg-raised/40 transition-all hover:border-brand/50 hover:glow-brand"
          >
            <Search className="text-muted-foreground size-4.5" />
          </button>
          <AuthButton hasSession={hasSession} />
          {menu.length > 0 ? (
            <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger
                className="grid size-10 place-items-center rounded-full border border-border/60 bg-raised/40 transition-colors hover:border-brand/50 md:hidden"
                aria-label="Открыть меню"
              >
                <Menu className="text-muted-foreground size-4.5" />
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle>Меню</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4">
                  <NavItems items={menu} />
                </nav>
              </SheetContent>
            </Sheet>
          ) : null}
        </div>
      </div>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
