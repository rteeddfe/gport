"use client";

import { motion } from "framer-motion";

import type { Product } from "@/types/api";
import { ProductCard } from "./product-card";
import { riseItem, staggerContainer } from "@/features/home/components/motion-presets";

/**
 * Product grid that staggers its cards in when scrolled into view
 * (shared with the home block's reveal language). Server pages fetch
 * the data and pass plain items across the RSC boundary.
 */
export function ProductRevealGrid({
  items,
  columnsClass = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  sizes,
}: {
  items: Product[];
  columnsClass?: string;
  sizes?: string;
}) {
  return (
    <motion.ul
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className={`grid gap-4 ${columnsClass}`}
    >
      {items.map((product) => (
        <motion.li key={product.id} variants={riseItem}>
          <ProductCard product={product} sizes={sizes} />
        </motion.li>
      ))}
    </motion.ul>
  );
}
