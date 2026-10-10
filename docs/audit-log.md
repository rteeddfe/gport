# Audit Log (M-AUDIT-1)

Server-side append-only audit log for high-value admin mutations. The log
answers **who** (actor + role), **what** (typed action), **on what**
(entity type + id), **with what non-sensitive context** (sanitized metadata)
and **from where** (IP + user-agent) — and deliberately nothing else.

## Core invariants (must never be violated)

1. **Trusted actor only.** The actor is taken exclusively from the
   authenticated context (`@CurrentUser()` → `auditActorFromAuthUser`). It is
   never read from request body, query, headers or metadata — a client cannot
   forge, spoof or omit the actor. Anonymous actions (system context) are
   recorded with `actorUserId: null, actorRole: null`.
2. **Append-only.** There is no update or delete route for audit records. The
   only API is `GET /api/admin/audit-logs` (SUPER_ADMIN only). Deleting a user
   keeps their audit rows (`onDelete: SetNull` on `actorUserId`).
3. **Sanitized metadata.** Audit metadata MUST NOT contain passwords,
   credentials, access tokens, refresh tokens, JWTs, OAuth authorization codes,
   OAuth state, PKCE verifiers, client secrets, encryption keys, cookies or
   payment credentials. This is enforced by an **allowlist-first metadata
   design** (each audit event passes an explicit, hand-written metadata shape)
   plus a defense-in-depth denylist (`sanitizeMetadata` in
   `backend/src/audit/audit.service.ts`) that recursively drops keys matching a
   sensitive-name set (normalized comparison: lowercase, `_`/`-` stripped,
   exact match — never substring). Objects whose every key was dropped are
   omitted entirely. Caps: depth 6, 100 keys, 50 array items, 2000 chars per
   string.
4. **Atomic.** The mutation and its audit row are written in the same
   Prisma `$transaction` (`AuditService.logInTransaction`) — either both are
   committed or neither. A failed standalone audit write is logged server-side
   with the action name only (no values) and never silently swallowed.
5. **Backend is the source of truth.** The audit API ignores any client-supplied
   actor; RBAC is enforced by the global guards (`JwtAuthGuard` + `RolesGuard`,
   `@Roles(Role.SUPER_ADMIN)`), which SUPER_ADMIN alone passes.

## What is logged today

| Action | Entity | Trigger |
| --- | --- | --- |
| `integration.created` | `integration` | provider configured for the first time (metadata: changed field names, secret field names, enabled — **names only, never values**) |
| `integration.updated` | `integration` | config changed (metadata: names of changed fields) |
| `integration.enabled` / `integration.disabled` | `integration` | enable toggle |
| `integration.secret_set` | `integration` | a secret field was (re)set (metadata: `secretField`, `operation: "set"`) |
| `integration.secret_deleted` | `integration` | a secret field was deleted (metadata: `secretField`, `operation: "delete"`) |
| `integration.deleted` | `integration` | integration reset |
| `user.access_updated` | `user` | role/permissions changed (metadata: changed field names) |
| `user.deleted` | `user` | user deleted (metadata: email, role) |
| `user.sessions_revoked` | `user` | all sessions revoked (metadata: `revokedCount`) |
| `user.session_revoked` | `user` | one session revoked (metadata: `sessionId`) |

Typed constants live in `backend/src/audit/audit.constants.ts`
(`AUDIT_ACTIONS`, `AUDIT_ENTITY_TYPES`).

## What is never logged

- Secret/config **values** of any kind — only field names.
- Passwords, password hashes, tokens, JWTs, OAuth codes/state/PKCE verifiers,
  client secrets, encryption keys, cookies, payment credentials (see
  invariant 3).
- Raw request bodies or full payloads — metadata is a small, explicit shape
  per event, not a dump.

## Data model

`AuditLog` (see `backend/prisma/schema.prisma`, migration
`20261008064920_audit_logs`): `actorUserId` (FK → User, SetNull),
`actorRole`, `action`, `entityType`, `entityId?`, `metadata Json?`,
`ipAddress?`, `userAgent?`, `createdAt`. Indexes on `createdAt`,
`[actorUserId, createdAt]`, `[entityType, entityId, createdAt]`,
`[action, createdAt]`. No `updatedAt` — rows are immutable.

## Read API

`GET /api/admin/audit-logs` — SUPER_ADMIN only. Query parameters
(`AuditLogsQueryDto`): `page` (default 1), `limit` (default 50, max 100),
`action`, `entityType`, `entityId`, `actorUserId` (UUID), `dateFrom`/`dateTo`
(ISO date). Ordered by `createdAt DESC`. Response:
`{ items, total, page, limit, pages }`.

Frontend: the audit table lives inside the admin «Состояние» page
(`/admin/health`, «Журнал аудита» section, SUPER_ADMIN only — for other
admin roles the block is hidden; the SUPER_ADMIN-only API remains the
access gate) — read-only table with the same filters, metadata rendered
as plain text. Formerly a separate `/admin/audit` tab, merged into
«Состояние» by owner request (2026-10-10).

## IP / user-agent

Extracted server-side from the Express request (`auditRequestContext`) —
never from client-controlled payloads. Optional; system-originated entries
may omit both.

## Future phases (not in M-AUDIT-1)

- More domains wired in (orders, payments, products, promo codes).
- Retention policy / archival.
- Export.
