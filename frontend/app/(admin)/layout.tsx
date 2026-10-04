import type { Metadata } from "next";

import { AdminShell } from "@/features/admin/components/admin-shell";

export const metadata: Metadata = {
  title: {
    default: "Админ-панель",
    template: "%s — GPort Админ",
  },
  robots: { index: false, follow: false },
};

/** Admin area: its own chrome (no storefront header/footer), gated by
 * AdminShell to SUPER_ADMIN (UX gate — the backend RolesGuard decides). */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
