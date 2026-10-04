import { SettingsTabs } from "@/features/settings/components/settings-tabs";

/** Admin «Настройки сайта» shell: the section header + the route tabs,
 * shared by all five sub-pages. */
export default function AdminSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Настройки сайта</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Контент и конфигурация магазина — изменения сразу видны на витрине.
        </p>
      </header>
      <div className="mt-6">
        <SettingsTabs />
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
