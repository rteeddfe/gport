import type { Prisma } from '../generated/prisma/client.js';

/** Safely reads a JSON column as a string→string bag: non-object shapes
 * and non-string values are silently ignored (the DB bag is admin- and
 * runtime-resolved data, never trusted blindly). */
export function readStringBag(
  value: Prisma.JsonValue | undefined | null,
): Record<string, string> {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const bag: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') {
      bag[key] = entry;
    }
  }
  return bag;
}
