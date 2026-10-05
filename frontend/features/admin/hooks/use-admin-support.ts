"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  adminDeleteTicket,
  adminGetTickets,
  adminUpdateTicket,
  type FindTicketsParams,
} from "@/services/support.service";
import type { SupportTicketStatus } from "@/types/api";

export function useAdminTickets(params: FindTicketsParams = {}) {
  return useQuery({
    queryKey: ["admin-support", params],
    queryFn: () => adminGetTickets(params),
  });
}

export function useAdminTicketMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-support"] });
  };

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SupportTicketStatus }) =>
      adminUpdateTicket(id, status),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteTicket(id),
    onSuccess: invalidate,
  });

  return { update, remove };
}
