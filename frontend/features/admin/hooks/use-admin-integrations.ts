"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  adminGetIntegrations,
  adminUpdateIntegration,
} from "@/services/integrations.service";
import type { IntegrationUpdateInput } from "@/types/api";

export const ADMIN_INTEGRATIONS_QUERY_KEY = ["admin-integrations"] as const;

export function useAdminIntegrations() {
  return useQuery({
    queryKey: ADMIN_INTEGRATIONS_QUERY_KEY,
    queryFn: adminGetIntegrations,
  });
}

export function useAdminUpdateIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      provider,
      input,
    }: {
      provider: string;
      input: IntegrationUpdateInput;
    }) => adminUpdateIntegration(provider, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_INTEGRATIONS_QUERY_KEY,
      });
    },
  });
}
