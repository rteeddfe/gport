"use client";

import { motion } from "framer-motion";

import type { Product } from "@/types/api";
import { ProductCard } from "./product-card";
import { riseItem, staggerContainer } from "@/features/home/components/motion-presets";

/**
 * Product grid that staggers its cards in on mount (shared with the home
 * block's reveal language). Server pages fetch the data and pass plain
 * items across the RSC boundary.
 *
 * Deliberately `animate` instead of `whileInView`: the catalog navigates
 * client-side, and the viewport observer kept freshly mounted grids stuck
 * at the hidden variant (cards in the DOM, opacity 0 — empty-looking
 * category tabs). A mount animation is deterministic.
 */
export function ProductRevealGrid({
  items,
  columnsClass = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  sizes,
  logoUrl = "",
}: {
  items: Product[];
  columnsClass?: string;
  sizes?: string;
  /** Settings logo for the no-cover card fallback. */
  logoUrl?: string;
}) {
  return (
    <motion.ul
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={`grid gap-4 ${columnsClass}`}
    >
      {items.map((product) => (
        <motion.li key={product.id} variants={riseItem}>
          <ProductCard product={product} sizes={sizes} logoUrl={logoUrl} />
        </motion.li>
      ))}
    </motion.ul>
  );
}
