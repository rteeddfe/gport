import { redirect } from "next/navigation";

/** /admin/settings is just the tab shell — land on the first tab. */
export default function AdminSettingsIndexPage() {
  redirect("/admin/settings/general");
}
