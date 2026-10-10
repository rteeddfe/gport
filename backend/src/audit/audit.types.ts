import type { AuthUser } from '../common/types/auth-user.js';
import type { AuditAction, AuditEntityType } from './audit.constants.js';

/**
 * Trusted actor context: ALWAYS derived server-side from the
 * authenticated request (`@CurrentUser()`), never from body/query. The
 * controller layer has no way to audit-log under someone else's name —
 * AuditService accepts only this shape.
 */
export interface AuditActor {
  id: string | null;
  role: string | null;
}

export function auditActorFromAuthUser(user: AuthUser | undefined): AuditActor {
  return user ? { id: user.id, role: user.role } : { id: null, role: null };
}

/**
 * Request context as AuditService sees it: only the two server-side
 * extracted fields — the full request object (headers, cookies, body)
 * never reaches the audit storage.
 */
export interface AuditRequestContext {
  ipAddress: string | null;
  userAgent: string | null;
}

/** Server-side extraction of the minimal audit request context. */
export function auditRequestContext(request?: {
  ip?: unknown;
  headers?: Record<string, unknown> | undefined;
}): AuditRequestContext {
  const userAgent = request?.headers?.['user-agent'];
  return {
    ipAddress: typeof request?.ip === 'string' ? request.ip : null,
    userAgent: typeof userAgent === 'string' ? userAgent : null,
  };
}

/** Input of AuditService.log(): the caller supplies trusted actor +
 * typed action; metadata is sanitized server-side before persisting. */
export interface AuditEntryInput {
  actor: AuditActor;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  /** Sanitized shape, built by the caller from an explicit allowlist of
   * safe fields; the sanitizer is the second line of defense. */
  metadata?: Record<string, unknown>;
  request?: AuditRequestContext;
}

export interface AuditLogView {
  id: string;
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}
