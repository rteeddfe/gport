"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Menu, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PanelNav } from "@/components/layout/panel-nav";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { UserCard } from "@/features/auth/components/user-card";
import { useMe } from "@/features/auth/hooks/use-me";
import { visibleAdminNavItems } from "../permissions";

function AccessDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="border-border bg-surface w-full max-w-md rounded-2xl border p-8 text-center">
        <span className="bg-destructive/10 text-destructive mx-auto grid size-12 place-items-center rounded-full">
          <ShieldAlert className="size-6" />
        </span>
        <h1 className="mt-4 text-lg font-semibold">Нет доступа</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Панель управления доступна только администраторам.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">На главную</Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * Chrome of the admin area: role gate + sidebar layout. ADMINs enter the
 * panel and see only the tabs their permissions cover; SUPER_ADMIN sees
 * everything. The gate is UX-only — the backend RolesGuard stays the
 * source of truth; every admin API call returns 403 for lesser access.
 * The session lives in httpOnly cookies and is validated by /auth/me, so
 * the panel survives page reloads.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isPending } = useMe();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isPending && !user) router.replace("/sign-in");
  }, [isPending, user, router]);

  if (isPending || !user) return null;

  if (user.role === "USER") {
    return <AccessDenied />;
  }

  const navItems = visibleAdminNavItems(user);

  return (
    <div className="flex min-h-screen">
      <aside className="bg-surface border-border hidden w-60 shrink-0 flex-col border-r md:flex">
        <div className="border-border flex h-16 items-center gap-2.5 border-b px-5">
          <Link
            href="/"
            aria-label="Перейти на сайт"
            title="Перейти на сайт"
            className="transition-opacity hover:opacity-80"
          >
            <Image
              src="/logo2.png"
              alt="GPort"
              width={2400}
              height={1569}
              className="h-7 w-auto object-contain"
            />
          </Link>
          <span className="text-muted-foreground text-[11px] leading-tight">
            админ-
            <br />
            панель
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <PanelNav items={navItems} label="Админ-панель" />
        </div>
        <div className="border-border space-y-2 border-t p-3">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/">
              <ExternalLink className="size-4" />
              Перейти на сайт
            </Link>
          </Button>
          <UserCard user={user} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-border bg-canvas/80 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur md:hidden">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger
              className="border-border bg-raised/40 hover:border-brand/50 grid size-9 place-items-center rounded-lg border transition-colors"
              aria-label="Открыть меню"
            >
              <Menu className="text-muted-foreground size-4.5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <SheetHeader>
                <SheetTitle>Админ-панель</SheetTitle>
              </SheetHeader>
              <PanelNav
                items={navItems}
                label="Админ-панель"
                onNavigate={() => setMobileNavOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <Link
            href="/"
            aria-label="Перейти на сайт"
            title="Перейти на сайт"
            className="transition-opacity hover:opacity-80"
          >
            <Image
              src="/logo2.png"
              alt="GPort"
              width={2400}
              height={1569}
              className="h-7 w-auto object-contain"
            />
          </Link>
          <Link
            href="/"
            aria-label="Перейти на сайт"
            title="Перейти на сайт"
            className="border-border bg-raised/40 hover:border-brand/50 ml-auto grid size-9 place-items-center rounded-lg border transition-colors"
          >
            <ExternalLink className="text-muted-foreground size-4.5" />
          </Link>
          <Badge variant="secondary" className="text-[10px] uppercase">
            {user.role}
          </Badge>
        </div>

        <main className="flex-1 px-6 py-8 lg:px-10">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
