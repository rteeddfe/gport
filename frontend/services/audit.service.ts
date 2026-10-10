import { apiFetch } from "@/lib/api/client";
import { buildQuery } from "@/lib/api/query";
import type { PaginatedAuditLogs, AuditLogsQueryParams } from "@/types/api";

/** SUPER_ADMIN-only audit log (M-AUDIT-1): read-only API, append-only
 * storage — no mutation endpoints exist. */
export async function adminGetAuditLogs(
  params: AuditLogsQueryParams = {},
): Promise<PaginatedAuditLogs> {
  return apiFetch<PaginatedAuditLogs>(
    `/admin/audit-logs${buildQuery({ ...params })}`,
  );
}
