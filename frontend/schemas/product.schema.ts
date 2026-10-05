import { z } from "zod";

/** Mirrors the backend CreateProductDto (admin products form). Ruble
 * amounts stay strings in the form and are converted to kopecks in
 * onSubmit; the backend re-validates everything. The kind fields follow
 * the product kind: nominals for TOPUP_NOMINAL, the amount range and the
 * account field for the top-ups. */
export const productSchema = z
  .object({
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
    kind: z.enum(["GAME_KEY", "TOPUP_NOMINAL", "TOPUP_AMOUNT"]),
    /** TOPUP_AMOUNT only (rubles in the form). */
    minAmountRub: z.string().regex(/^$|^\d+(?:[.,]\d{1,2})?$/, "Формат: 50 или пусто"),
    maxAmountRub: z.string().regex(/^$|^\d+(?:[.,]\d{1,2})?$/, "Формат: 14000 или пусто"),
    creditingMode: z.enum(["AUTO_CODE", "MANUAL"]),
    accountFieldKind: z.enum(["", "LOGIN", "ID", "EMAIL"]),
    accountFieldLabel: z.string().trim().max(100, "Не длиннее 100 символов"),
    accountFieldHint: z.string().trim().max(200, "Не длиннее 200 символов"),
    /** TOPUP_NOMINAL only: the purchasable nominals. */
    variants: z
      .array(
        z.object({
          label: z.string().trim().min(1, "Укажите название").max(100),
          value: z.string().regex(/^$|^\d+$/, "Только целое число"),
          unit: z.string().trim().max(20, "Не длиннее 20 символов"),
          priceRub: z.string().regex(/^\d+(?:[.,]\d{1,2})?$/, "Формат: 86 или 86.50"),
          oldPriceRub: z.string().regex(/^$|^\d+(?:[.,]\d{1,2})?$/, "Формат: 120 или пусто"),
        }),
      )
      .max(100, "Не больше 100 номиналов"),
    categoryId: z.string().uuid("Выберите категорию"),
  })
  .superRefine((values, ctx) => {
    if (values.kind === "TOPUP_NOMINAL" && values.status === "PUBLISHED") {
      if (values.variants.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["variants"],
          message: "Добавьте хотя бы один номинал перед публикацией",
        });
      }
      for (const [index, variant] of values.variants.entries()) {
        if (!variant.priceRub) {
          ctx.addIssue({
            code: "custom",
            path: ["variants", index, "priceRub"],
            message: "Укажите цену номинала",
          });
        }
      }
    }
    if (values.kind === "TOPUP_AMOUNT" && values.status === "PUBLISHED") {
      const min = Number(values.minAmountRub.replace(",", "."));
      const max = Number(values.maxAmountRub.replace(",", "."));
      if (!values.minAmountRub || !values.maxAmountRub || !(min < max)) {
        ctx.addIssue({
          code: "custom",
          path: ["minAmountRub"],
          message: "Укажите диапазон: минимум меньше максимума",
        });
      }
    }
  });

export type ProductFormValues = z.infer<typeof productSchema>;
