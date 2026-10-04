import { PromoCodesManager } from "@/features/admin/components/promo-codes-manager";

export const metadata = { title: "Промокоды" };

export default function AdminPromoCodesPage() {
  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Промокоды</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Скидочные коды, лимиты и сроки действия.
        </p>
      </header>
      <div className="mt-8">
        <PromoCodesManager />
      </div>
    </div>
  );
}
