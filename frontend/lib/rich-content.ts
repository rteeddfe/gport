/** Tailwind arbitrary-variant classes styling sanitized rich-text HTML —
 * shared by the admin Tiptap editor body and the public policy pages, so
 * editing and reading look the same without @tailwindcss/typography. */
export const richContentClass = [
  "[&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold",
  "[&_h3]:mt-5 [&_h3]:font-semibold",
  "[&_p]:my-2.5 [&_p]:leading-relaxed",
  "[&_ul]:my-2.5 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:my-2.5 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:my-1",
  "[&_table]:mt-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
  "[&_th]:border [&_th]:border-border [&_th]:bg-canvas [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold",
  "[&_td]:border [&_td]:border-border [&_td]:px-2.5 [&_td]:py-1.5",
  "[&_a]:text-brand [&_a]:underline",
].join(" ");
