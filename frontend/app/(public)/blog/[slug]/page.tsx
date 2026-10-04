import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { PostCard, formatPostDate } from "@/features/blog/components/post-card";
import { getPost, getPosts } from "@/services/posts.service";
import type { Post } from "@/types/api";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug).catch(() => null);
  if (!post) return { title: "Новость не найдена" };
  return {
    title: post.title,
    description: post.excerpt || undefined,
    ...(post.coverImageUrl
      ? { openGraph: { images: [{ url: post.coverImageUrl }] } }
      : {}),
  };
}

/** Public post page (PUBLISHED only, enforced by the API): breadcrumbs,
 * date, title, lead, cover, body and the latest other posts. */
export default async function PostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getPost(slug).catch(() => null);
  if (!post) notFound();

  let more: Post[] = [];
  try {
    const result = await getPosts({ limit: 4 });
    more = result.items.filter((item) => item.slug !== post.slug).slice(0, 3);
  } catch {
    // The «other posts» strip is optional — the article renders without it.
  }

  return (
    <Container className="py-12">
      <nav
        aria-label="Хлебные крошки"
        className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm"
      >
        <Link href="/blog" className="hover:text-brand">
          Блог
        </Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{post.title}</span>
      </nav>

      <article className="mt-8">
        <header className="max-w-3xl">
          <time
            dateTime={post.publishedAt ?? post.updatedAt}
            className="text-neon text-sm font-medium"
          >
            {formatPostDate(post.publishedAt ?? post.updatedAt)}
          </time>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {post.title}
          </h1>
          {post.excerpt ? (
            <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
              {post.excerpt}
            </p>
          ) : null}
        </header>

        {post.coverImageUrl ? (
          <div className="bg-canvas border-border relative mt-8 aspect-[16/9] max-w-4xl overflow-hidden rounded-2xl border">
            <Image
              src={post.coverImageUrl}
              alt=""
              fill
              priority
              sizes="(min-width: 1200px) 896px, 100vw"
              className="object-cover"
            />
          </div>
        ) : null}

        <div className="max-w-3xl">
          {post.content ? (
            <p className="mt-8 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
              {post.content}
            </p>
          ) : (
            <p className="text-muted-foreground mt-8 text-sm italic">
              Текст новости скоро появится.
            </p>
          )}
          <Link
            href="/blog"
            className="text-neon mt-10 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          >
            <span aria-hidden>←</span>
            Все новости
          </Link>
        </div>
      </article>

      {more.length > 0 ? (
        <section className="mt-16">
          <h2 className="text-lg font-semibold">Другие новости</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((item) => (
              <PostCard key={item.id} post={item} />
            ))}
          </div>
        </section>
      ) : null}
    </Container>
  );
}
