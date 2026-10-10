import { CategoriesManager } from "@/features/admin/components/categories-manager";
import { CategoriesTabs } from "@/features/admin/components/categories-tabs";

export const metadata = { title: "Категории" };

/** Admin «Категории» section, tab 1: the admin-made catalog categories
 * bound to the fixed sections. The «Списки» tab next door holds the
 * select registries (метки, платформа, жанры…). */
export default function AdminCategoriesPage() {
  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Категории</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Категории каталога на базе заданных разделов; списки значений —
          на соседней вкладке.
        </p>
      </header>
      <div className="mt-6">
        <CategoriesTabs />
      </div>
      <div className="mt-6 max-w-4xl">
        <CategoriesManager />
      </div>
    </div>
  );
}
