import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

export interface TrafficSettings {
  autoBanEnabled: boolean;
  banThresholdRequests: number;
  banWindowSeconds: number;
  banDurationMinutes: number;
}

export interface BanRow {
  id: string;
  ip: string;
  reason: string | null;
  expiresAt: Date | null;
  createdBy: string;
}

export interface TrafficSnapshot {
  /** Requests received in the last 60 seconds (this instance). */
  rpsLastMinute: number;
  /** Top active IPs over the 5-minute window (this instance). */
  topIps: { ip: string; requests: number }[];
  /** Active bans: rows whose expiry is null or in the future. */
  activeBans: BanRow[];
  settings: TrafficSettings;
}

const TOP_WINDOW_MS = 5 * 60_000;
/** Memory guard: at most this many IPs tracked in the sliding window —
 * an attacker inventing millions of source IPs cannot balloon the heap. */
const MAX_TRACKED_IPS = 10_000;
const SETTINGS_CACHE_TTL_MS = 30_000;
const BANS_CACHE_TTL_MS = 30_000;

/**
 * Anti-DDoS v1 core (per instance, in-memory): a sliding-window request
 * counter per IP, the ban cache (exact IPs + IPv4 CIDR subnets) with the
 * auto-ban thresholds from SecuritySettings, and the manual/auto ban
 * operations the admin panel drives. Bans and settings reload from the
 * database every 30 s and immediately after an admin change.
 */
@Injectable()
export class TrafficService implements OnModuleDestroy {
  private readonly logger = new Logger(TrafficService.name);
  private readonly hits = new Map<string, number[]>();
  private settings: TrafficSettings = {
    autoBanEnabled: false,
    banThresholdRequests: 240,
    banWindowSeconds: 60,
    banDurationMinutes: 30,
  };
  private settingsLoadedAt = 0;
  private bans: { ip: string; expiresAt: Date | null }[] = [];
  private exactBans = new Set<string>();
  private cidrBans: { network: number; mask: number }[] = [];
  private bansLoadedAt = 0;
  private reloadTimer: NodeJS.Timeout | undefined;

  constructor(private readonly prisma: PrismaService) {
    // Periodic background reload keeps multi-instance deployments honest;
    // the refresh timer must not hold the process open.
    this.reloadTimer = setInterval(() => {
      void this.refreshCaches();
    }, BANS_CACHE_TTL_MS);
    this.reloadTimer.unref?.();
  }

  onModuleDestroy(): void {
    clearInterval(this.reloadTimer);
  }

  /** Express middleware body: reject banned IPs, count everyone else. */
  async handle(
    ip: string,
  ): Promise<boolean> {
    await this.refreshCaches();
    if (this.isBanned(ip)) {
      return false;
    }
    this.record(ip);
    return true;
  }

  async snapshot(): Promise<TrafficSnapshot> {
    await this.refreshCaches();
    const now = Date.now();
    const rpsWindowStart = now - 60_000;
    let rpsLastMinute = 0;
    for (const timestamps of this.hits.values()) {
      for (const t of timestamps) {
        if (t > rpsWindowStart) rpsLastMinute += 1;
      }
    }
    const topWindowStart = now - TOP_WINDOW_MS;
    const topIps = [...this.hits.entries()]
      .map(([ip, timestamps]) => ({
        ip,
        requests: timestamps.filter((t) => t > topWindowStart).length,
      }))
      .filter((entry) => entry.requests > 0)
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);
    // The admin table needs the full rows (reason, expiry, author).
    const [rows, settings] = await Promise.all([
      this.prisma.blockedIp.findMany({
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.readSettings(),
    ]);
    return { rpsLastMinute, topIps, activeBans: rows, settings };
  }

  async ban(
    ip: string,
    options: { reason?: string | null; minutes: number | null; createdBy: string },
  ): Promise<BanRow> {
    const expiresAt =
      options.minutes && options.minutes > 0
        ? new Date(Date.now() + options.minutes * 60_000)
        : null;
    const row = await this.prisma.blockedIp.upsert({
      where: { ip },
      update: { reason: options.reason ?? null, expiresAt, createdBy: options.createdBy },
      create: {
        ip,
        reason: options.reason ?? null,
        expiresAt,
        createdBy: options.createdBy,
      },
    });
    await this.reloadBans();
    this.logger.warn(`IP ${ip} забанен (${options.createdBy})`);
    return row;
  }

  async unban(id: string): Promise<void> {
    await this.prisma.blockedIp.delete({ where: { id } }).catch(() => null);
    await this.reloadBans();
  }

  async updateSettings(dto: TrafficSettings): Promise<TrafficSettings> {
    const row = await this.prisma.securitySettings.upsert({
      where: { id: 1 },
      update: dto,
      create: { id: 1, ...dto },
    });
    this.settings = {
      autoBanEnabled: row.autoBanEnabled,
      banThresholdRequests: row.banThresholdRequests,
      banWindowSeconds: row.banWindowSeconds,
      banDurationMinutes: row.banDurationMinutes,
    };
    this.settingsLoadedAt = Date.now();
    return this.settings;
  }

  /** Sliding-window counter + auto-ban enforcement. */
  private record(ip: string): void {
    const now = Date.now();
    const settings = this.settings;
    if (settings.autoBanEnabled) {
      const windowStart = now - settings.banWindowSeconds * 1000;
      const recent = (this.hits.get(ip) ?? []).filter((t) => t > windowStart);
      if (recent.length >= settings.banThresholdRequests) {
        // Fire-and-forget: the ban lands mid-request, the current one
        // still completes but every next one is rejected.
        void this.ban(ip, {
          reason: `Авто-бан: >${settings.banThresholdRequests} запросов за ${settings.banWindowSeconds} с`,
          minutes: settings.banDurationMinutes > 0 ? settings.banDurationMinutes : null,
          createdBy: 'system',
        }).catch((error: unknown) =>
          this.logger.error(`Авто-бан ${ip} не сработал: ${String(error)}`),
        );
        this.exactBans.add(ip);
      }
    }
    const topWindowStart = now - TOP_WINDOW_MS;
    const timestamps = (this.hits.get(ip) ?? []).filter((t) => t > topWindowStart);
    timestamps.push(now);
    this.hits.set(ip, timestamps);
    // Evict cold IPs when the map grows beyond the memory guard.
    if (this.hits.size > MAX_TRACKED_IPS) {
      for (const [key, ts] of this.hits) {
        if (ts[ts.length - 1] <= topWindowStart) {
          this.hits.delete(key);
        }
        if (this.hits.size <= MAX_TRACKED_IPS) break;
      }
    }
  }

  isBanned(ip: string): boolean {
    if (this.exactBans.has(ip)) return true;
    if (this.cidrBans.length > 0) {
      const v4 = this.ipv4ToInt(ip);
      if (v4 !== null) {
        for (const { network, mask } of this.cidrBans) {
          if ((v4 & mask) === network) return true;
        }
      }
    }
    return false;
  }

  /** Reload bans+settings when the cache TTL expired (cheap: small tables). */
  private async refreshCaches(): Promise<void> {
    const now = Date.now();
    if (now - this.bansLoadedAt > BANS_CACHE_TTL_MS) {
      await this.reloadBans();
    }
    if (now - this.settingsLoadedAt > SETTINGS_CACHE_TTL_MS) {
      this.settings = await this.readSettings();
      this.settingsLoadedAt = now;
    }
  }

  private async reloadBans(): Promise<void> {
    const now = new Date();
    const rows = await this.prisma.blockedIp.findMany({
      where: { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      select: { ip: true, expiresAt: true },
    });
    this.bans = rows;
    this.exactBans = new Set<string>();
    this.cidrBans = [];
    for (const { ip } of rows) {
      const cidr = ip.match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
      if (cidr) {
        const network = this.ipv4ToInt(cidr[1]);
        if (network !== null) {
          const prefix = Math.min(Number(cidr[2]), 32);
          const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
          this.cidrBans.push({ network: network & mask, mask });
        }
        continue;
      }
      this.exactBans.add(ip);
    }
    this.bansLoadedAt = Date.now();
  }

  private async readSettings(): Promise<TrafficSettings> {
    const row = await this.prisma.securitySettings.findUnique({ where: { id: 1 } });
    if (!row) return this.settings;
    return {
      autoBanEnabled: row.autoBanEnabled,
      banThresholdRequests: row.banThresholdRequests,
      banWindowSeconds: row.banWindowSeconds,
      banDurationMinutes: row.banDurationMinutes,
    };
  }

  /** Dotted-quad → unsigned 32-bit; null for anything else (IPv6 stays
   * exact-match only). */
  private ipv4ToInt(value: string): number | null {
    const parts = value.split('.');
    if (parts.length !== 4) return null;
    let result = 0;
    for (const part of parts) {
      const octet = Number(part);
      if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
      result = (result << 8) | octet;
    }
    return result >>> 0;
  }
}
