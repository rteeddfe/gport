import { AdminBreadcrumbs } from "@/features/admin/components/admin-breadcrumbs";
import { ProductFormSection } from "@/features/admin/components/product-form-section";

export const metadata = { title: "Изменить товар" };

/** Admin edit-product page (id-addressed; the public page is slug-addressed). */
export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <AdminBreadcrumbs
        items={[{ label: "Товары", href: "/admin/products" }, { label: "Изменение товара" }]}
      />
      <header className="mt-2">
        <h1 className="text-2xl font-bold tracking-tight">Изменить товар</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Правки появляются на витрине сразу после сохранения (если статус —
          «Опубликован»).
        </p>
      </header>
      <div className="mt-8 max-w-4xl">
        <ProductFormSection productId={id} />
      </div>
    </div>
  );
}
