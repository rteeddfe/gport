/** Fixed kinds of the «Списки» registry (admin: «Категории» → «Списки»).
 * The kinds are system-defined; the admin fills name+slug values. A
 * product links its columns (tags, platform, genre, consoles, group,
 * features) to these values by slug. */
export const LIST_KINDS = [
  { value: "tags", label: "Метки" },
  { value: "platform", label: "Платформа" },
  { value: "genre", label: "Жанры" },
  { value: "consoles", label: "Консоли" },
  { value: "subscription-group", label: "Группа подписки" },
  { value: "subscription-includes", label: "Что входит в подписку" },
] as const;

export function listKindLabel(kind: string): string {
  return LIST_KINDS.find((item) => item.value === kind)?.label ?? kind;
}
