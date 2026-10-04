"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsSettingsForm } from "./analytics-settings-form";
import { useSiteSettings } from "../hooks/use-site-settings";

/** Data wrapper for the admin analytics form. */
export function AnalyticsSettingsSection() {
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
  return <AnalyticsSettingsForm settings={query.data} />;
}
