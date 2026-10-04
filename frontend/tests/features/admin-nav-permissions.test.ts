import { ADMIN_NAV_ITEMS } from "@/features/admin/nav";
import { visibleAdminNavItems } from "@/features/admin/permissions";

const base = { id: "u1", email: "a@b.c", name: null as string | null };

describe("visibleAdminNavItems", () => {
  it("shows a SUPER_ADMIN every section, including user management", () => {
    const items = visibleAdminNavItems({
      ...base,
      role: "SUPER_ADMIN",
      permissions: [],
    });
    expect(items).toEqual(ADMIN_NAV_ITEMS);
    expect(items.some((item) => item.href === "/admin/users")).toBe(true);
  });

  it("shows an ADMIN only the tabs their permissions cover", () => {
    const items = visibleAdminNavItems({
      ...base,
      role: "ADMIN",
      permissions: ["posts"],
    });
    expect(items.map((item) => item.href)).toEqual([
      "/admin",
      "/admin/blog",
      "/admin/health",
    ]);
  });

  it("shows an ADMIN with all permissions the four content tabs but not users/settings", () => {
    const items = visibleAdminNavItems({
      ...base,
      role: "ADMIN",
      permissions: ["products", "posts", "reviews", "promo-codes"],
    });
    expect(items.map((item) => item.href)).toEqual([
      "/admin",
      "/admin/products",
      "/admin/categories",
      "/admin/blog",
      "/admin/reviews",
      "/admin/promo-codes",
      "/admin/health",
    ]);
  });

  it("shows an ADMIN without permissions only the neutral sections", () => {
    const items = visibleAdminNavItems({
      ...base,
      role: "ADMIN",
      permissions: [],
    });
    expect(items.map((item) => item.href)).toEqual([
      "/admin",
      "/admin/health",
    ]);
  });
});
