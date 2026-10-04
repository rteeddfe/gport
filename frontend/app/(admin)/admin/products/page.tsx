import { ProductsManager } from "@/features/admin/components/products-manager";

export const metadata = { title: "Товары" };

/** Admin products: search/status/category filters, paginated table with
 * price, stock, status and row actions; create/edit on their own pages. */
export default function AdminProductsPage() {
  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Товары</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Каталог игр: цены, скидки, остатки и статусы публикации.
        </p>
      </header>
      <div className="mt-8">
        <ProductsManager />
      </div>
    </div>
  );
}
