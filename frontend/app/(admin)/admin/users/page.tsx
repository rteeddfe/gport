import { UsersManager } from "@/features/admin/components/users-manager";

export const metadata = { title: "Пользователи" };

/** SUPER_ADMIN user management. The page itself is UX: the API returns
 * 403 for ADMIN/USER, so the table just shows the error for them. */
export default function AdminUsersPage() {
  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Пользователи</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Аккаунты, роли, права доступа к вкладкам и активные сессии.
        </p>
      </header>
      <div className="mt-8">
        <UsersManager />
      </div>
    </div>
  );
}
