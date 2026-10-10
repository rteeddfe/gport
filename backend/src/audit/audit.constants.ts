/** Typed audit vocabulary (M-AUDIT-1): no ad-hoc strings across the
 * codebase. Only actions that EXIST in the code are declared — new events
 * are added together with the feature that performs them. */
export const AUDIT_ACTIONS = {
  INTEGRATION_CREATED: 'integration.created',
  INTEGRATION_UPDATED: 'integration.updated',
  INTEGRATION_ENABLED: 'integration.enabled',
  INTEGRATION_DISABLED: 'integration.disabled',
  INTEGRATION_SECRET_SET: 'integration.secret_set',
  INTEGRATION_SECRET_DELETED: 'integration.secret_deleted',
  INTEGRATION_DELETED: 'integration.deleted',
  USER_ACCESS_UPDATED: 'user.access_updated',
  USER_DELETED: 'user.deleted',
  USER_SESSIONS_REVOKED: 'user.sessions_revoked',
  USER_SESSION_REVOKED: 'user.session_revoked',
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_CANCELED: 'payment.canceled',
  PAYMENT_WEBHOOK_REJECTED: 'payment.webhook_rejected',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const AUDIT_ENTITY_TYPES = {
  INTEGRATION: 'integration',
  USER: 'user',
  ORDER: 'order',
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[keyof typeof AUDIT_ENTITY_TYPES];
