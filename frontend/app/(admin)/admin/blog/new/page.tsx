import { PostFormSection } from "@/features/admin/components/post-form-section";

export const metadata = { title: "Новая новость" };

/** Admin create-post page. */
export default function AdminNewPostPage() {
  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Новая новость</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Заголовок, обложка, текст и статус публикации.
        </p>
      </header>
      <div className="mt-8 max-w-4xl">
        <PostFormSection />
      </div>
    </div>
  );
}
