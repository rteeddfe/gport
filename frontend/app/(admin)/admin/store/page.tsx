import { StoreSettingsSection } from "@/features/settings/components/store-settings-section";

export const metadata = { title: "Магазин — админ-панель" };

/** Admin «Магазин» section (SUPER_ADMIN-only): acquiring configuration
 * moved out of «Настройки сайта» into its own sidebar tab. */
export default function AdminStorePage() {
  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Магазин</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Оплата, эквайринг и исходящие письма магазина.
        </p>
      </header>
      <div className="mt-8">
        <StoreSettingsSection />
      </div>
    </div>
  );
}
