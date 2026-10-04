import { PostsManager } from "@/features/admin/components/posts-manager";

export const metadata = { title: "Блог" };

/** Admin blog: paginated table with status filter and row actions;
 * create/edit on their own pages. */
export default function AdminBlogPage() {
  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Блог</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Новости магазина: статьи и анонсы для витрины (/blog).
        </p>
      </header>
      <div className="mt-8">
        <PostsManager />
      </div>
    </div>
  );
}
