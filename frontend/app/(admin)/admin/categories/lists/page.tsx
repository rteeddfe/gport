import { ListsManager } from "@/features/admin/components/lists-manager";
import { CategoriesTabs } from "@/features/admin/components/categories-tabs";

export const metadata = { title: "Списки" };

/** Admin «Категории» section, tab 2: the value registries (метки,
 * платформа, жанры…) behind the product form selects and the catalog
 * filters. Lists have no routes of their own. */
export default function AdminListsPage() {
  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Списки</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Значения для селектов товара и фильтров каталога. Сами виды
          списков заданы системой.
        </p>
      </header>
      <div className="mt-6">
        <CategoriesTabs />
      </div>
      <div className="mt-6 max-w-4xl">
        <ListsManager />
      </div>
    </div>
  );
}
