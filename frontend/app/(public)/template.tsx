"use client";

import { MotionConfig, motion } from "framer-motion";

/**
 * Storefront page transition: a template remounts on every navigation,
 * so page content fades in from a soft blur while rising — the theme's
 * «in-focus» effect — and the header and footer (root layout) stay put.
 * Enter-only by design — the App Router has no exit slot (NEXT-1151);
 * the hero plays its own exit before navigating. `prefers-reduced-motion`
 * (via MotionConfig) degrades this to a plain fade.
 */
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
