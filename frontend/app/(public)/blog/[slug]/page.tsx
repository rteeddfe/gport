import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { PostCard } from "@/features/blog/components/post-card";
import { formatDateLong } from "@/lib/format";
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

/** Public post page (PUBLISHED only, enforced by the API): an in-container
 * cover hero sized like the home page's first screen, with the date,
 * title and lead inside the image container over a gradient overlay
 * (posts without a cover get the store-logo fallback like the post
 * cards), then the body in a centered column and the latest other posts. */
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

  const publishedAt = post.publishedAt ?? post.updatedAt;

  return (
    <article>
      <Container className="pt-6">
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
      </Container>

      {/* Hero inside the container, sized like the home page's first
          screen: the date, title and lead sit inside the image container
          over a gradient. */}
      <section className="mt-4">
        <Container>
          <div className="border-border relative h-[calc(100svh-9rem)] max-h-[680px] min-h-[340px] w-full overflow-hidden rounded-3xl border">
            {post.coverImageUrl ? (
              <Image
                src={post.coverImageUrl}
                alt=""
                fill
                priority
                sizes="(min-width: 1232px) 1200px, 100vw"
                className="object-cover"
              />
            ) : (
              <div
                aria-hidden
                className="absolute inset-0 grid place-items-center bg-[radial-gradient(16rem_12rem_at_50%_20%,rgb(139_92_246/0.25),transparent_70%),radial-gradient(12rem_10rem_at_80%_90%,rgb(85_221_229/0.15),transparent_70%)]"
              >
                <Image
                  src="/logo2.png"
                  alt=""
                  width={2400}
                  height={1569}
                  className="relative h-20 w-auto opacity-90"
                />
              </div>
            )}
            {/* Gradient overlay: contrast for the title block at the bottom
                and a soft blend into the page below. */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/55 to-canvas/10"
            />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
              <time dateTime={publishedAt} className="text-neon text-sm font-medium">
                {formatDateLong(publishedAt)}
              </time>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                {post.title}
              </h1>
              {post.excerpt ? (
                <p className="text-foreground/80 mt-4 max-w-3xl text-lg leading-relaxed">
                  {post.excerpt}
                </p>
              ) : null}
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-12">
        <div className="mx-auto max-w-3xl">
          {post.content ? (
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
              {post.content}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm italic">
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
    </article>
  );
}
