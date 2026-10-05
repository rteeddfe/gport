import { Container } from "@/components/layout/container";
import { DashboardNav } from "@/features/account/components/dashboard-nav";
import { OrdersList } from "@/features/account/components/orders-list";

export const metadata = { title: "Заказы" };

/** The buyer's orders: direct purchases with statuses and the
 * auto-delivered keys. */
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

        <OrdersList />
      </div>
    </Container>
  );
}
