import { CategoriesManager } from "@/features/admin/components/categories-manager";

export const metadata = { title: "Категории" };

/** Admin categories: create, rename, re-slug and delete (empty) catalog
 * sections; the slug drives the public /products?category= filter. */
export default function AdminCategoriesPage() {
  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Категории</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Разделы каталога: игры, валюта и будущие подразделы.
        </p>
      </header>
      <div className="mt-8 max-w-4xl">
        <CategoriesManager />
      </div>
    </div>
  );
}
