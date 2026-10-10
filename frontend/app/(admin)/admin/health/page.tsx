import { AuditSection } from "@/features/admin/components/audit-section";
import { HealthStatusCards } from "@/features/admin/components/health-status-cards";
import { TrafficPanel } from "@/features/admin/components/traffic-panel";

export const metadata = { title: "Состояние" };

/** Live system status: the real /health endpoint (API + database probe)
 * through the shared useHealth hook, plus the anti-DDoS panel — per-IP
 * traffic counters, manual bans and the auto-ban thresholds — and the
 * SUPER_ADMIN-only audit trail (moved here from the former /admin/audit
 * tab; the backend API stays the access gate). */
export default function AdminHealthPage() {
  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Состояние</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Доступность API и базы данных, трафик и защита от атак, журнал аудита.
        </p>
      </header>
      <div className="mt-8">
        <HealthStatusCards />
      </div>
      <div className="mt-8 max-w-4xl">
        <TrafficPanel />
      </div>
      <AuditSection />
    </div>
  );
}
