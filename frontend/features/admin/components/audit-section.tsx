"use client";

import { AuditLogTable } from "@/features/admin/components/audit-log-table";
import { useMe } from "@/features/auth/hooks/use-me";

/**
 * Audit block on the «Состояние» page: the same SUPER_ADMIN-only audit
 * table, embedded under the health/traffic panels. Hidden for other admin
 * roles — the SUPER_ADMIN-only backend API remains the source of truth.
 */
export function AuditSection() {
  const { data: user } = useMe();
  if (user?.role !== "SUPER_ADMIN") {
    return null;
  }
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold tracking-tight">Журнал аудита</h2>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
        Критичные административные и security-действия. Только чтение.
      </p>
      <div className="mt-6">
        <AuditLogTable />
      </div>
    </section>
  );
}
