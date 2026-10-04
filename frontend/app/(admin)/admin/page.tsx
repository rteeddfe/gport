import { OverviewSections } from "@/features/admin/components/overview-sections";

export const metadata = { title: "Обзор" };

/** Admin overview: section cards instead of fake stats — no aggregate
 * endpoints exist yet, real metrics land here when those APIs are approved.
 * The cards reuse the sidebar's permission filter. */
export default function AdminOverviewPage() {
  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Обзор</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Базовая панель управления магазином. Разделы наполняются по мере
          появления админских API.
        </p>
      </header>
      <OverviewSections />
    </div>
  );
}
