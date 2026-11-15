export const RETENTION_DAYS = 30;

/**
 * Filter object ensuring soft-deleted documents are excluded.
 * Compatible with existing documents where deletedAt is undefined or null.
 */
export function activeFilter(): Record<string, unknown> {
  return { deletedAt: { $in: [null, undefined] } };
}

/** Returns true if a document has been marked as soft-deleted. */
export function isSoftDeleted(doc?: { deletedAt?: Date | string | null }): boolean {
  return Boolean(doc?.deletedAt);
}

/** Calculates remaining days before a soft-deleted item is purged. */
export function getDaysRemaining(
  deletedAt: Date | string,
  referenceDate: Date = new Date()
): number {
  const delTime = new Date(deletedAt).getTime();
  const refTime = referenceDate.getTime();
  const daysPassed = Math.floor((refTime - delTime) / (1000 * 60 * 60 * 24));
  return Math.max(0, RETENTION_DAYS - daysPassed);
}

/** Returns the cutoff Date before which items are permanently purgable. */
export function getPurgeCutoffDate(referenceDate: Date = new Date()): Date {
  return new Date(referenceDate.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
}
