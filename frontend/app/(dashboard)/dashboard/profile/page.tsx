import { cookies } from "next/headers";

import { Container } from "@/components/layout/container";
import { DashboardNav } from "@/features/account/components/dashboard-nav";
import { ProfileSettings } from "@/features/account/components/profile-settings";
import { me } from "@/services/auth.service";
import type { AuthUser } from "@/types/api";

export const metadata = { title: "Профиль" };

/** Profile settings. Server Component shell fetches the session profile
 * once (the browser cookies are forwarded manually — a server fetch has
 * no cookie jar of its own); the forms live in ProfileSettings. */
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

        {user ? <ProfileSettings user={user} /> : null}
      </div>
    </Container>
  );
}
