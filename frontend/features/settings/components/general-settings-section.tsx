"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { GeneralSettingsForm } from "./general-settings-form";
import { useSiteSettings } from "../hooks/use-site-settings";

/** Data wrapper for the admin general-settings form. */
export function GeneralSettingsSection() {
  const query = useSiteSettings();

  if (query.isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (query.isError) {
    return (
      <p className="text-destructive text-sm">
        Не удалось загрузить настройки: {query.error.message}
      </p>
    );
  }
  return <GeneralSettingsForm settings={query.data} />;
}
