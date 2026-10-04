import { UserDetail } from "@/features/admin/components/user-detail";

export const metadata = { title: "Пользователь" };

/** Admin user detail (id-addressed): profile, role and permission form,
 * active sessions with revocation, account deletion. */
export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Пользователь</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Профиль, роль и права, активные сессии аккаунта.
        </p>
      </header>
      <div className="mt-8">
        <UserDetail userId={id} />
      </div>
    </div>
  );
}
