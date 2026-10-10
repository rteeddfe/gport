import { apiFetch } from "@/lib/api/client";
import type { TrafficSnapshotView } from "@/types/api";

/** The «Состояние» traffic panel: per-IP counters of this instance, the
 * active ban list and the anti-DDoS thresholds. SUPER_ADMIN only (the
 * backend guards it with the role). */
export function getTrafficStatus(): Promise<TrafficSnapshotView> {
  return apiFetch<TrafficSnapshotView>("/admin/traffic/status");
}

export interface TrafficSettingsInput {
  autoBanEnabled: boolean;
  banThresholdRequests: number;
  banWindowSeconds: number;
  banDurationMinutes: number;
}

export function updateTrafficSettings(
  input: TrafficSettingsInput,
): Promise<TrafficSettingsInput> {
  return apiFetch<TrafficSettingsInput, TrafficSettingsInput>(
    "/admin/traffic/settings",
    { method: "PUT", body: input },
  );
}

export interface BanIpInput {
  /** Exact IP (v4/v6) or an IPv4 CIDR subnet («185.220.0.0/16»). */
  ip: string;
  reason?: string | null;
  /** Minutes until the ban lifts; null = permanent. */
  minutes?: number | null;
}

export function banIp(input: BanIpInput): Promise<unknown> {
  return apiFetch<unknown, BanIpInput>("/admin/traffic/bans", {
    method: "POST",
    body: input,
  });
}

export function unbanIp(id: string): Promise<void> {
  return apiFetch<void>(`/admin/traffic/bans/${id}`, { method: "DELETE" });
}
