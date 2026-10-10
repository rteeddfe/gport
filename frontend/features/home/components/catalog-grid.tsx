"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LayoutGrid } from "lucide-react";

import type { Product } from "@/types/api";
import { ProductCard } from "@/features/products/components/product-card";
import { riseItem, staggerContainer } from "./motion-presets";
import { SectionHeading } from "./section-heading";

/**
 * Presentational part of a home catalog block («Игровые валюты»,
 * «Игры») — the section itself stays a Server Component and owns the
 * data fetch: heading and ProductCard grid stagger in when the block
 * scrolls into view, a «Ещё» tile links to the full category listing.
 */
export function CatalogGrid({
  items,
  kicker,
  title,
  moreHref,
  logoUrl = "",
}: {
  items: Product[];
  kicker: string;
  title: React.ReactNode;
  moreHref: string;
  /** Settings logo for the no-cover card fallback. */
  logoUrl?: string;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      <motion.div variants={riseItem}>
        <SectionHeading
          kicker={kicker}
          title={title}
        />
      </motion.div>
      <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((product) => (
          <motion.li key={product.id} variants={riseItem}>
            <ProductCard product={product} logoUrl={logoUrl} />
          </motion.li>
        ))}
        <motion.li variants={riseItem}>
          <Link
            href={moreHref}
            className="flex h-full min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-border/70 bg-canvas/50 text-muted-foreground transition-colors duration-200 hover:border-brand/50 hover:text-foreground"
          >
            <LayoutGrid className="size-6" aria-hidden />
            <span className="text-sm font-medium">Ещё</span>
          </Link>
        </motion.li>
      </ul>
    </motion.div>
  );
}
