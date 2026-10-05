import { apiFetch } from "@/lib/api/client";
import { buildQuery } from "@/lib/api/query";
import type { Paginated } from "@/lib/api/types";
import type {
  AdminSupportTicketView,
  PaginatedTickets,
  SupportTicketStatus,
  SupportTicketView,
} from "@/types/api";

/** Public submission from the storefront support bubble. */
export function createSupportTicket(input: {
  name?: string;
  contact: string;
  message: string;
}): Promise<SupportTicketView> {
  return apiFetch<SupportTicketView, typeof input>("/support", {
    method: "POST",
    body: input,
  });
}

export interface FindTicketsParams {
  page?: number;
  limit?: number;
  status?: SupportTicketStatus;
}

export function adminGetTickets(params: FindTicketsParams = {}): Promise<PaginatedTickets> {
  return apiFetch<PaginatedTickets>(`/admin/support${buildQuery({ ...params })}`);
}

export function adminUpdateTicket(
  id: string,
  status: SupportTicketStatus,
): Promise<AdminSupportTicketView> {
  return apiFetch<AdminSupportTicketView, { status: SupportTicketStatus }>(
    `/admin/support/${id}`,
    {
      method: "PATCH",
      body: { status },
    },
  );
}

export function adminDeleteTicket(id: string): Promise<void> {
  return apiFetch<void>(`/admin/support/${id}`, { method: "DELETE" });
}
