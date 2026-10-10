import { Injectable, Logger } from '@nestjs/common';
import type { Prisma, Role } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, type AuditAction, type AuditEntityType } from './audit.constants.js';
import type { AuditEntryInput, AuditLogView } from './audit.types.js';

export { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES };
export type { AuditAction, AuditEntityType };

/** Append-only: the ONLY way rows appear in AuditLog. No update/delete
 * methods exist on this service — that is the policy, not an omission. */

/**
 * Keys that must NEVER persist in audit metadata, regardless of what a
 * caller passes. Defense-in-depth backstop around the explicit allowlist
 * shapes the call sites build (see docs/audit-log.md): a accidentally
 * passed `password` / `clientSecret` / token field is dropped here.
 * Matching is exact on the normalized key name (lowercase, underscores
 * and dashes stripped) — never a substring match, so safe keys like
 * `changedFields` survive.
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'passwordconfirmation',
  'currentpassword',
  'newpassword',
  'passwd',
  'secret',
  'clientsecret',
  'clientsecrets',
  'apisecret',
  'webhooksecret',
  'apikey',
  'secretkey',
  'encryptionkey',
  'integrationsencryptionkey',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'sessiontoken',
  'jwt',
  'authorization',
  'cookie',
  'cookies',
  'state',
  'code',
  'codeverifier',
  'verifier',
  'challenge',
  'challengecode',
  'otp',
  'pin',
  'cvv',
  'cvc',
  'cardnumber',
  'pan',
]);

const MAX_DEPTH = 6;
const MAX_ARRAY_ITEMS = 50;
const MAX_STRING_LENGTH = 2000;
const MAX_KEYS = 100;

export interface PaginatedAuditLogs {
  items: AuditLogView[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AuditFindFilters {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Standalone append (mutation paths that are a single DB call anyway). */
  async log(entry: AuditEntryInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({ data: this.toRow(entry) });
    } catch {
      // A failed audit must not break the business mutation, but it must
      // also not vanish silently: it surfaces in the server logs. The
      // error is logged without its payload — it may contain entry values.
      this.logger.error(`audit write failed: ${entry.action}`);
    }
  }

  /** Atomic append inside the SAME Prisma transaction as the mutation —
   * the mutation and its audit trail commit or roll back together, so a
   * security-sensitive change can never land "without a trace". */
  async logInTransaction(
    tx: Prisma.TransactionClient,
    entry: AuditEntryInput,
  ): Promise<void> {
    await tx.auditLog.create({ data: this.toRow(entry) });
  }

  /** SUPER_ADMIN read path: newest first, filterable, sanitized rows. */
  async findMany(filters: AuditFindFilters): Promise<PaginatedAuditLogs> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 50));
    const where: Prisma.AuditLogWhereInput = {
      action: filters.action,
      entityType: filters.entityType,
      entityId: filters.entityId,
      actorUserId: filters.actorUserId,
      createdAt: {
        ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
        ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
      },
    };
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      items: rows.map(toView),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  private toRow(entry: AuditEntryInput): Prisma.AuditLogCreateInput {
    return {
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata
        ? (sanitizeMetadata(entry.metadata) as Prisma.InputJsonValue)
        : undefined,
      actorRole: (entry.actor.role as Role | null) ?? null,
      ipAddress: entry.request?.ipAddress ?? null,
      userAgent: entry.request?.userAgent ?? null,
      ...(entry.actor.id
        ? { actorUser: { connect: { id: entry.actor.id } } }
        : {}),
    };
  }
}

function toView(row: Prisma.AuditLogGetPayload<object>): AuditLogView {
  return {
    id: row.id,
    actorUserId: row.actorUserId,
    actorRole: row.actorRole ?? null,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: row.metadata ?? null,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Recursive sanitizer: drops sensitive keys entirely, caps depth/breadth/
 * string length so the audit metadata can never turn into a storage for
 * request payloads. Non-serializable values are coerced to strings. */
export function sanitizeMetadata(
  value: unknown,
  depth = 0,
): Record<string, unknown> | null {
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const result: Record<string, unknown> = {};
  let count = 0;
  for (const [rawKey, rawValue] of Object.entries(value)) {
    if (++count > MAX_KEYS) {
      break;
    }
    const key = rawKey.toLowerCase().replaceAll(/[_-]/g, '');
    if (SENSITIVE_KEYS.has(key)) {
      continue;
    }
    const sanitized = sanitizeValue(rawValue, depth + 1);
    // An object whose every key was dropped (all-sensitive payload) is
    // omitted entirely — no empty husks of secret objects in the log.
    if (
      sanitized !== null &&
      typeof sanitized === 'object' &&
      !Array.isArray(sanitized) &&
      Object.keys(sanitized as Record<string, unknown>).length === 0
    ) {
      continue;
    }
    result[rawKey] = sanitized;
  }
  return result;
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}…`
      : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    return sanitizeMetadata(value, depth + 1);
  }
  // Symbol/function/bigint have no safe audit representation — a fixed
  // marker avoids accidental dumps (an implicit toString may leak data).
  return '[non-serializable]';
}
