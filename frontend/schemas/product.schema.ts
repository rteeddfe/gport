import { z } from "zod";

/** Shape of the future product create/edit form (admin dashboard). */
export const productFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  priceCents: z.number("Enter a valid price").int().min(0, "Price must be >= 0"),
  categoryId: z.uuid("Select a category"),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
