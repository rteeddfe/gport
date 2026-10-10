"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { adminGetAuditLogs } from "@/services/audit.service";
import type { AuditLogsQueryParams } from "@/types/api";

export const ADMIN_AUDIT_QUERY_KEY = ["admin-audit-logs"] as const;

export function useAdminAuditLogs(params: AuditLogsQueryParams = {}) {
  return useQuery({
    queryKey: [...ADMIN_AUDIT_QUERY_KEY, params],
    queryFn: () => adminGetAuditLogs(params),
    // While filters/pagination change, keep the previous page rendered so the
    // filter form never unmounts mid-typing.
    placeholderData: keepPreviousData,
  });
}
