import type { Variants } from "framer-motion";

/**
 * Shared entrance presets for the homepage blocks: a container staggers
 * its motion children, children rise 24px — the same language as the
 * hero banner and the service wall. Sections use them with
 * `initial="hidden" whileInView="show" viewport={{ once: true }}`.
 */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
