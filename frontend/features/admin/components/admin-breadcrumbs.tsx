import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface AdminBreadcrumb {
  label: string;
  /** Omitted for the current page — it renders as plain text. */
  href?: string;
}

/** Breadcrumb trail of the admin panel's sub-pages (edit forms etc.).
 * Always starts at «Админка» (/admin); the last item is the current page. */
export function AdminBreadcrumbs({ items }: { items: AdminBreadcrumb[] }) {
  return (
    <nav
      aria-label="Хлебные крошки"
      className="text-muted-foreground flex items-center gap-1.5 text-xs"
    >
      <Link
        href="/admin"
        className="transition-colors hover:text-foreground"
      >
        Админка
      </Link>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <ChevronRight className="size-3" aria-hidden />
          {item.href ? (
            <Link
              href={item.href}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
