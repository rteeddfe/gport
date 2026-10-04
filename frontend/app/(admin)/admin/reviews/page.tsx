import { ReviewsManager } from "@/features/admin/components/reviews-manager";

export const metadata = { title: "Отзывы" };

/** Admin review moderation: every submission (PENDING by default on the
 * backend) — publish, reject or delete inline. */
export default function AdminReviewsPage() {
  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Отзывы</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Модерация отзывов с витрины: публикация, отклонение и удаление.
          Новый отзыв попадает в статус «На модерации».
        </p>
      </header>
      <div className="mt-8">
        <ReviewsManager />
      </div>
    </div>
  );
}
