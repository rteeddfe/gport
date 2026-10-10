import { IntegrationsSection } from "@/features/admin/components/integrations-section";
import { AnalyticsSettingsSection } from "@/features/settings/components/analytics-settings-section";

export const metadata = { title: "Интеграции" };

/** «Интеграции» admin tab — OAuth-провайдеры (Яндекс ID / VK ID),
 * настройки внешних сервисов (M-INTEGRATIONS) и Яндекс Метрика
 * (аналитика — тоже интеграция с внешним сервисом). */
export default function AdminIntegrationsPage() {
  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Интеграции</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Вход через Яндекс ID и VK ID, аналитика, платёжные провайдеры и
          внешние сервисы.
        </p>
      </header>
      <div className="mt-8">
        <IntegrationsSection />
      </div>
      <section aria-label="Аналитика" className="mt-10 max-w-2xl">
        <h2 className="text-xl font-semibold tracking-tight">Аналитика</h2>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Яндекс Метрика, Вебвизор и подтверждение сайта в Яндекс Вебмастере.
        </p>
        <div className="mt-6">
          <AnalyticsSettingsSection />
        </div>
      </section>
    </div>
  );
}
