import type { ReactNode } from "react";

import { cn } from "cn";

/** Shared homepage section header: cyan kicker + big title, same
 * language as the hero banner's «Пополнение сервисов» kicker. */
export function SectionHeading({
  kicker,
  title,
  className,
}: {
  kicker: string;
  title: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon">{kicker}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">{title}</h2>
    </div>
  );
}
