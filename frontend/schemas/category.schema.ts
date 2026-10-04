import { z } from "zod";

/** Mirrors the backend CreateCategoryDto (admin categories form). An empty
 * slug means «generate from the name» on the backend. */
export const categorySchema = z.object({
  name: z.string().trim().min(1, "Укажите название").max(100, "Не длиннее 100 символов"),
  slug: z
    .string()
    .trim()
    .regex(/^$|^[a-z0-9]+(-[a-z0-9]+)*$/, "Латиница в нижнем регистре, через дефис")
    .max(100),
  description: z.string().trim().max(500, "Не длиннее 500 символов"),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
