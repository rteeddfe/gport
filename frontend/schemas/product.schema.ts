import { z } from "zod";

/** Mirrors the backend CreateProductDto (admin products form). Ruble
 * amounts stay strings in the form and are converted to kopecks in
 * onSubmit; the backend re-validates everything. */
export const productSchema = z.object({
  title: z.string().trim().min(1, "Укажите название").max(200, "Не длиннее 200 символов"),
  slug: z
    .string()
    .trim()
    .regex(/^$|^[a-z0-9]+(-[a-z0-9]+)*$/, "Латиница в нижнем регистре, через дефис")
    .max(200),
  description: z.string().max(5000, "Не длиннее 5000 символов"),
  instruction: z.string().max(5000, "Не длиннее 5000 символов"),
  region: z.string().trim().max(100, "Не длиннее 100 символов"),
  platform: z.string().trim().max(100, "Не длиннее 100 символов"),
  /** Comma-separated in the form; split into an array before submit. */
  genre: z.string().max(500, "Не длиннее 500 символов"),
  localization: z.string().trim().max(100, "Не длиннее 100 символов"),
  ageRating: z.string().trim().max(10, "Не длиннее 10 символов"),
  images: z.array(z.string().min(1)),
  priceRub: z
    .string()
    .regex(/^\d+(?:[.,]\d{1,2})?$/, "Формат: 1299 или 1299.99"),
  oldPriceRub: z
    .string()
    .regex(/^$|^\d+(?:[.,]\d{1,2})?$/, "Формат: 2599 или пусто"),
  stock: z
    .string()
    .regex(/^\d+$/, "Только целое число, не меньше 0"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  categoryId: z.string().uuid("Выберите категорию"),
});

export type ProductFormValues = z.infer<typeof productSchema>;
