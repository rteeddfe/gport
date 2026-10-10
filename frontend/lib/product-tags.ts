/** Card badges («метки карточки»): stored as machine tags on the product,
 * displayed in Russian on the storefront and in the admin selects. Unknown
 * values fall back to the raw tag. */
const TAG_LABELS: Record<string, string> = {
  hit: "Хит",
  new: "Новинка",
};

export function productTagLabel(tag: string): string {
  return TAG_LABELS[tag] ?? tag;
}
