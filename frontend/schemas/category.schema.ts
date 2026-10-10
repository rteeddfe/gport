import { z } from "zod";

import { SECTIONS } from "@/lib/sections";

/** Mirrors the backend CreateCategoryDto (admin categories form). An empty
 * slug means «generate from the name» on the backend. The раздел is one of
 * the three fixed sections — the system-defined storefront routing. */
export const categorySchema = z.object({
  name: z.string().trim().min(1, "Укажите название").max(100, "Не длиннее 100 символов"),
  slug: z
    .string()
    .trim()
    .regex(/^$|^[a-z0-9]+(-[a-z0-9]+)*$/, "Латиница в нижнем регистре, через дефис")
    .max(100),
  description: z.string().trim().max(500, "Не длиннее 500 символов"),
  type: z.enum(SECTIONS.map((section) => section.value) as [string, ...string[]], {
    message: "Выберите раздел",
  }),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
