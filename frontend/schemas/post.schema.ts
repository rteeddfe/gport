import { z } from "zod";

/** Mirrors the backend CreatePostDto (admin blog form). An empty slug means
 * «generate from the title» on the backend; the cover is set by the upload
 * field, not typed by hand. */
export const postSchema = z.object({
  title: z.string().trim().min(1, "Укажите заголовок").max(200, "Не длиннее 200 символов"),
  slug: z
    .string()
    .trim()
    .regex(/^$|^[a-z0-9]+(-[a-z0-9]+)*$/, "Латиница в нижнем регистре, через дефис")
    .max(200),
  excerpt: z.string().max(300, "Не длиннее 300 символов"),
  content: z.string().max(50000, "Не длиннее 50000 символов"),
  coverImageUrl: z.string().max(500),
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

export type PostFormValues = z.infer<typeof postSchema>;
