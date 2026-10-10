"use client";

import { IntegrationCard } from "@/features/admin/components/integration-card";
import { useAdminIntegrations } from "@/features/admin/hooks/use-admin-integrations";
import { useMe } from "@/features/auth/hooks/use-me";
import { getErrorMessage } from "@/lib/api/errors";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Admin «Настройки → Интеграции» (M-INTEGRATIONS-1): one card per
 * registered provider. Reading is open to ADMINs with the
 * «integrations» permission, writes are SUPER_ADMIN-only — the backend
 * guard is the source of truth, the form just renders read-only.
 */
export function IntegrationsSection() {
  const query = useAdminIntegrations();
  const { data: user } = useMe();
  const canManage = user?.role === "SUPER_ADMIN";

  if (query.isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (query.isError) {
    return (
      <p className="text-destructive text-sm">
        Не удалось загрузить интеграции: {getErrorMessage(query.error)}
      </p>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {query.data.map((integration) => (
        <IntegrationCard
          key={integration.provider}
          integration={integration}
          editable={canManage}
        />
      ))}
    </div>
  );
}
