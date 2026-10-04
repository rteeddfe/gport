import { HealthStatusCards } from "@/features/admin/components/health-status-cards";

export const metadata = { title: "Состояние" };

/** Live system status: the real /health endpoint (API + database probe)
 * through the shared useHealth hook. */
export default function AdminHealthPage() {
  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Состояние</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Доступность API и базы данных магазина.
        </p>
      </header>
      <div className="mt-8">
        <HealthStatusCards />
      </div>
    </div>
  );
}
