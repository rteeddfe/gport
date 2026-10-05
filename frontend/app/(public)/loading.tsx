import { Container } from "@/components/layout/container";

/** Route-level streaming shell for the storefront. With this boundary in
 * place next/link's dynamic-route prefetch grabs this cheap skeleton
 * instead of executing a full server render (the high-load dam), and
 * navigations show it while the section streams in. */
export default function Loading() {
  return (
    <Container className="py-10">
      <div aria-hidden className="animate-pulse space-y-8">
        <div className="bg-raised/60 h-40 rounded-3xl" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="bg-raised/40 h-56 rounded-2xl" />
          ))}
        </div>
      </div>
      <span className="sr-only">Загрузка…</span>
    </Container>
  );
}
