/** Yandex Webmaster verification: admins may paste either the bare content
 * value or the whole <meta> tag from the webmaster UI — extract the value
 * that goes into <meta name="yandex-verification">. */
export function yandexVerificationCode(
  raw: string | null | undefined,
): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (!value.includes("<")) return value;

  if (!/name\s*=\s*["']yandex-verification["']/i.test(value)) return null;
  const match = value.match(/content\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  const code = match?.[1] ?? match?.[2];
  return code && code.trim() ? code.trim() : null;
}
