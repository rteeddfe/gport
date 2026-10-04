import Image from "next/image";
import Link from "next/link";

import type { Post } from "@/types/api";

/** Long-form ru date for the blog («4 октября 2026 г.»). */
export function formatPostDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Blog card for /blog and the homepage news block: horizontal cover
 * (16:9) with the store logo on a neon wash as the fallback (no letter —
 * a post without art still reads as GPort), date, title and lead. Whole
 * card links to the post page; hover = lift + brand glow (CSS only).
 */
export function PostCard({ post }: { post: Post }) {
  const cover = post.coverImageUrl;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block h-full overflow-hidden rounded-2xl border border-border bg-surface transition-[transform,translate,box-shadow] duration-200 hover:-translate-y-1 hover:glow-brand"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-canvas">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
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
              className="relative h-14 w-auto opacity-90"
            />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <time
          dateTime={post.publishedAt ?? post.updatedAt}
          className="text-neon text-xs font-medium"
        >
          {formatPostDate(post.publishedAt ?? post.updatedAt)}
        </time>
        <h3 className="mt-1.5 text-base font-semibold leading-snug">{post.title}</h3>
        {post.excerpt ? (
          <p className="text-muted-foreground mt-2 line-clamp-3 text-sm leading-relaxed">
            {post.excerpt}
          </p>
        ) : null}
        {/* Text link, not a glowing button — only the arrow reacts. */}
        <span className="text-brand mt-auto inline-flex items-center gap-1 pt-3 text-sm font-medium transition-colors group-hover:text-brand-bright">
          Читать
          <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
