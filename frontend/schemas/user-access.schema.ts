import { z } from "zod";

/** Mirrors the backend UpdateUserAccessDto (SUPER_ADMIN user form). The
 * API never grants SUPER_ADMIN, so the form only switches USER|ADMIN;
 * the permission list is replaced as a whole on save. */
export const userAccessSchema = z.object({
  role: z.enum(["USER", "ADMIN"]),
  permissions: z.array(z.enum(["products", "orders", "files", "posts", "reviews", "promo-codes", "support"])),
});

export type UserAccessValues = z.infer<typeof userAccessSchema>;
