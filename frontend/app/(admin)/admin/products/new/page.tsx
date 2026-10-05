import { AdminBreadcrumbs } from "@/features/admin/components/admin-breadcrumbs";
import { ProductFormSection } from "@/features/admin/components/product-form-section";

export const metadata = { title: "Новый товар" };

/** Admin create-product page. */
export default function AdminNewProductPage() {
  return (
    <div>
      <AdminBreadcrumbs
        items={[{ label: "Товары", href: "/admin/products" }, { label: "Новый товар" }]}
      />
      <header className="mt-2">
        <h1 className="text-2xl font-bold tracking-tight">Новый товар</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Карточка игры: обложки, цена, характеристики и статус публикации.
        </p>
      </header>
      <div className="mt-8 max-w-4xl">
        <ProductFormSection />
      </div>
    </div>
  );
}
