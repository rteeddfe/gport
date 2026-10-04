import { AnalyticsSettingsSection } from "@/features/settings/components/analytics-settings-section";

export const metadata = { title: "Аналитика" };

/** «Аналитика» admin tab — Yandex Metrika (counter + Webvisor) and the
 * Yandex Webmaster verification tag, stored in the site settings row.
 * Sales reports remain a placeholder until the aggregate API is approved. */
export default function AdminAnalyticsPage() {
  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Аналитика</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Яндекс Метрика, Вебвизор и подтверждение сайта в Яндекс Вебмастере.
        </p>
      </header>
      <div className="mt-8 max-w-2xl">
        <AnalyticsSettingsSection />
      </div>
    </div>
  );
}
