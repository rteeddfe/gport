/** Fixed storefront sections («разделы») — заданы системой, правок в
 * админке нет. They drive the catalog routes and the «Раздел» selects
 * in the admin (category and product forms). Mirrors the backend. */
export const SECTIONS = [
  { value: "games", label: "Игры" },
  { value: "subscriptions", label: "Подписки" },
  { value: "currency", label: "Валюта и пополнение" },
] as const;
