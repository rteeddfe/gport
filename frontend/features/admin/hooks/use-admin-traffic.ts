"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  banIp,
  getTrafficStatus,
  unbanIp,
  updateTrafficSettings,
  type BanIpInput,
  type TrafficSettingsInput,
} from "@/services/traffic.service";

export function useTrafficStatus() {
  return useQuery({
    queryKey: ["admin-traffic"],
    queryFn: getTrafficStatus,
    // A monitoring panel: keep it fresh while open.
    refetchInterval: 15_000,
  });
}

export function useTrafficMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-traffic"] });
  };

  const ban = useMutation({
    mutationFn: (input: BanIpInput) => banIp(input),
    onSuccess: invalidate,
  });
  const unban = useMutation({
    mutationFn: (id: string) => unbanIp(id),
    onSuccess: invalidate,
  });
  const updateSettings = useMutation({
    mutationFn: (input: TrafficSettingsInput) => updateTrafficSettings(input),
    onSuccess: invalidate,
  });

  return { ban, unban, updateSettings };
}
