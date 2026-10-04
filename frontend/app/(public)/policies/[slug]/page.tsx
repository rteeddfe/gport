import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { richContentClass } from "@/lib/rich-content";
import { getPolicy } from "@/services/policies.service";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getPolicy(slug).catch(() => null);
  if (!doc) return { title: "Страница не найдена" };
  return { title: doc.title };
}

/** Policy document rendered from the admin-managed rich text
 * («Настройки сайта → Юр. информация»). The stored HTML was sanitized
 * server-side on write, so verbatim rendering is safe here. */
export default async function PolicyPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = await getPolicy(slug).catch(() => null);
  if (!doc) notFound();

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-3xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon">
            Информация
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {doc.title}
          </h1>
          <p className="text-muted-foreground mt-2 text-xs">
            Обновлено: {new Date(doc.updatedAt).toLocaleDateString("ru-RU")}
          </p>
        </header>

        <article
          className={`text-muted-foreground mt-8 rounded-3xl border border-border bg-canvas/70 px-6 py-8 text-sm sm:px-10 [&_h2]:text-foreground [&_h3]:text-foreground [&_th]:text-foreground ${richContentClass}`}
          dangerouslySetInnerHTML={{ __html: doc.content }}
        />
      </div>
    </Container>
  );
}
