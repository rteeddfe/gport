/** "1299.50" | "1299,50" → kopecks. Shared by the product and promo-code
 * admin forms; the backend re-validates the resulting integers. */
export function toCents(rubles: string): number {
  return Math.round(Number.parseFloat(rubles.replace(",", ".")) * 100);
}
