import { Container } from "@/components/layout/container";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardNav } from "@/features/account/components/dashboard-nav";

export const metadata = { title: "Заказы" };

/** Placeholder — the purchase/orders business process is not approved yet;
 * the section wires up when the orders backend exists. */
export default function OrdersPage() {
  return (
    <Container>
      <div className="py-10">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon">
            Личный кабинет
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Заказы
          </h1>
        </header>

        <div className="mt-6">
          <DashboardNav />
        </div>

        <EmptyState
          className="mt-8"
          title="Раздел в разработке"
          description="Появится вместе с процессом оформления заказов и оплаты."
        />
      </div>
    </Container>
  );
}
