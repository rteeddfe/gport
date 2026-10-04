import Image from "next/image";

import { cn } from "@/lib/utils";

import type { TopupService } from "../widget-data";

/** The service brand mark: a static SVG from /brands or the inline node
 * (Nintendo word mark) scaled to fit. The surrounding box stays in the
 * layout; size the mark via className. The inline node is sized through
 * font-size (its pill is em-based), so it always fits the box instead of
 * overflowing a transform scale. */
export function ServiceMark({
  service,
  className,
  scale = 0.4,
}: {
  service: TopupService;
  className?: string;
  scale?: number;
}) {
  if (service.icon) {
    return <Image src={service.icon} alt="" width={32} height={32} className={cn("object-contain", className)} />;
  }
  return (
    <span
      style={{ fontSize: `${scale * 16}px` }}
      className="shrink-0 leading-none"
      aria-hidden
    >
      {service.iconNode}
    </span>
  );
}
