"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { revalidateStorefrontTags } from "@/lib/revalidate";
import {
  getSettings,
  updateSettings,
  type UpdateSiteSettingsInput,
} from "@/services/settings.service";

export const SETTINGS_QUERY_KEY = ["settings"] as const;

export function useSiteSettings() {
  return useQuery({ queryKey: SETTINGS_QUERY_KEY, queryFn: getSettings });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSiteSettingsInput) => updateSettings(input),
    onSuccess: (saved) => {
      // Settings render in the root layout (title, favicon, logo, footer).
      void revalidateStorefrontTags(["settings"]);
      queryClient.setQueryData(SETTINGS_QUERY_KEY, saved);
    },
  });
}
