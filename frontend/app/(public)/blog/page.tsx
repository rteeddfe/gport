import Link from "next/link";

import { Container } from "@/components/layout/container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PostCard } from "@/features/blog/components/post-card";
import { getErrorMessage } from "@/lib/api/errors";
import { getFallbackLogo } from "@/services/settings.service";
import { getPosts } from "@/services/posts.service";
import type { Post } from "@/types/api";

export const metadata = { title: "Блог" };

const PAGE_SIZE = 9;

type SearchParams = Promise<{ page?: string }>;

/** Public blog list: PUBLISHED posts only (enforced by the API), newest
 * first, query-param pagination. */
export default async function BlogPage({ searchParams }: { searchParams: SearchParams }) {
  const { page: pageParam } = await searchParams;
  const logoUrl = await getFallbackLogo();
  const page = Math.max(1, Number(pageParam) || 1);

  let items: Post[] = [];
  let pages = 1;
  let total = 0;
  let errorMessage: string | null = null;

  try {
    const result = await getPosts({ page, limit: PAGE_SIZE });
    items = result.items;
    pages = result.pages;
    total = result.total;
  } catch (error) {
    errorMessage = getErrorMessage(error);
  }

  return (
    <Container className="py-12">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon">Блог</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Новости и <span className="text-gradient">статьи</span>
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
          Новости магазина, анонсы скидок и полезные материалы для игроков.
        </p>
      </header>

      <div className="mt-8">
        {errorMessage ? (
          <ErrorState title="Не удалось загрузить новости" message={errorMessage} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Новостей пока нет"
            description="Здесь появятся новости магазина — загляните позже."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((post) => (
              <PostCard key={post.id} post={post} logoUrl={logoUrl} />
            ))}
          </div>
        )}
      </div>

      {!errorMessage && pages > 1 ? (
        <nav
          aria-label="Постраничная навигация"
          className="mt-10 flex items-center justify-center gap-4"
        >
          {page > 1 ? (
            <Link
              href={`/blog${page > 2 ? `?page=${page - 1}` : ""}`}
              className="border-border bg-surface hover:border-brand/50 hover:glow-brand rounded-lg border px-4 py-2 text-sm transition-colors"
            >
              ← Новее
            </Link>
          ) : null}
          <span className="text-muted-foreground text-sm tabular-nums">
            Страница {page} из {pages} · {total}{" "}
            {total === 1 ? "новость" : total < 5 ? "новости" : "новостей"}
          </span>
          {page < pages ? (
            <Link
              href={`/blog?page=${page + 1}`}
              className="border-border bg-surface hover:border-brand/50 hover:glow-brand rounded-lg border px-4 py-2 text-sm transition-colors"
            >
              Старее →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </Container>
  );
}
