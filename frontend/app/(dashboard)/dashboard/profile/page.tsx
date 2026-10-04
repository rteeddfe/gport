import { cookies } from "next/headers";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardNav } from "@/features/account/components/dashboard-nav";
import { me } from "@/services/auth.service";
import type { AuthUser } from "@/types/api";

export const metadata = { title: "Профиль" };

/** Read-only profile. Server Component: the browser cookies are forwarded
 * manually (a server fetch has no cookie jar of its own). Editing waits for
 * a profile-update API. */
export default async function ProfilePage() {
  const cookieHeader = (await cookies()).toString();

  let user: AuthUser | null = null;
  try {
    user = await me(cookieHeader ? { cookie: cookieHeader } : undefined);
  } catch {
    user = null;
  }

  return (
    <Container>
      <div className="py-10">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon">
            Личный кабинет
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Профиль
          </h1>
        </header>

        <div className="mt-6">
          <DashboardNav />
        </div>

        {user ? (
          <dl className="border-border bg-surface mt-8 grid gap-x-8 gap-y-4 rounded-2xl border p-6 sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted-foreground text-sm">Имя</dt>
            <dd className="text-sm font-medium">{user.name ?? "—"}</dd>
            <dt className="text-muted-foreground text-sm">Email</dt>
            <dd className="text-sm font-medium">{user.email}</dd>
            <dt className="text-muted-foreground text-sm">Роль</dt>
            <dd>
              <Badge variant="secondary" className="text-[10px] uppercase">
                {user.role}
              </Badge>
            </dd>
          </dl>
        ) : null}

        <EmptyState
          className="mt-6"
          title="Редактирование в разработке"
          description="Смена имени и пароля появится вместе с API профиля."
        />
      </div>
    </Container>
  );
}
