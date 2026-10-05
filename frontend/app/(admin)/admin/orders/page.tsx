import { OrdersManager } from "@/features/admin/components/orders-manager";

export const metadata = { title: "Заказы" };

/** Admin orders: every buyer's direct purchase with its payment state. */
export default function AdminOrdersPage() {
  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Заказы</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Покупки игроков — оплата, статусы и состав. Ключи выдачи видит
          покупатель в своём кабинете.
        </p>
      </header>
      <div className="mt-8">
        <OrdersManager />
      </div>
    </div>
  );
}
