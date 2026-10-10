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
    /** Registry slug picked from the «Платформа» list; empty = none. */
    platform: z.string().trim().max(100),
    /** Multi-select of registry slugs («Жанры» list). */
    genre: z.array(z.string().max(100)).max(20),
    /** Multi-select of registry slugs («Консоли» list). */
    consoles: z.array(z.string().max(100)).max(20),
    /** Card badge («метка карточки») picked from the «Метки» list;
     * empty = no badge. */
    tags: z.string().max(100),
    /** Card cashback percent 0–99 (rubles strings are parsed on submit). */
    cashbackPercent: z.string().regex(/^$|^\d{1,2}$/, "Целое 0–99 или пусто"),
    releaseYear: z.string().regex(/^$|^\d{4}$/, "Год или пусто"),
    /** Card rating 0–5. */
    rating: z.string().regex(/^$|^[0-5](?:[.,]\d)?$/, "От 0 до 5 или пусто"),
    /** Subscription fields: one-liner, group slug, includes slugs. */
    tagline: z.string().trim().max(300, "Не длиннее 300 символов"),
    /** Registry slug picked from the «Группа подписки» list. */
    group: z.string().trim().max(100),
    /** Multi-select of registry slugs («Что входит в подписку»). */
    features: z.array(z.string().max(100)).max(50),
    searchAliases: z.string().max(400, "Не длиннее 400 символов"),
    /** Game PC system requirements: two tiers × five fixed rows. Empty
     * strings are dropped before submit; both tiers empty = no block. */
    systemRequirements: z.object({
      minimum: z.object({
        os: z.string().max(100, "Не длиннее 100 символов"),
        cpu: z.string().max(150, "Не длиннее 150 символов"),
        gpu: z.string().max(150, "Не длиннее 150 символов"),
        ram: z.string().max(50, "Не длиннее 50 символов"),
        storage: z.string().max(50, "Не длиннее 50 символов"),
      }),
      recommended: z.object({
        os: z.string().max(100, "Не длиннее 100 символов"),
        cpu: z.string().max(150, "Не длиннее 150 символов"),
        gpu: z.string().max(150, "Не длиннее 150 символов"),
        ram: z.string().max(50, "Не длиннее 50 символов"),
        storage: z.string().max(50, "Не длиннее 50 символов"),
      }),
    }),
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
    /** Product FAQ: Q/A rows shown in the form for create and edit; empty
     * rows are dropped before the FAQ replace call. */
    faq: z
      .array(
        z.object({
          id: z.string(),
          question: z.string().max(200, "Не длиннее 200 символов"),
          answer: z.string().max(2000, "Не длиннее 2000 символов"),
        }),
      )
      .max(20, "Не больше 20 вопросов"),
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
