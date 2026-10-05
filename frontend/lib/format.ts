/** Shared display formatters (ru-RU). One implementation per format —
 * the duplicated copies drifted (search prices rounded differently than
 * product cards, two different order-date formats). */

/** Kopecks → «1 234,5 ₽» (fractional only when the price has kopecks). */
export function formatPrice(priceCents: number): string {
  return `${(priceCents / 100).toLocaleString("ru-RU")} ₽`;
}

/** Timestamps → «5 октября 2026, 14:08» (orders, admin lists). */
export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Dates → «5 октября 2026» (blog posts, reviews). */
export function formatDateLong(value: string | Date): string {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
