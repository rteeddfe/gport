import { PostFormSection } from "@/features/admin/components/post-form-section";

export const metadata = { title: "Изменить новость" };

/** Admin edit-post page (id-addressed; the public page is slug-addressed). */
export default async function AdminEditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Изменить новость</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Правки появляются на витрине сразу после сохранения (если статус —
          «Опубликован»).
        </p>
      </header>
      <div className="mt-8 max-w-4xl">
        <PostFormSection postId={id} />
      </div>
    </div>
  );
}
