import { createHash } from "node:crypto";
import { stableStringify } from "../../domain/services/stable-stringify.js";

const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isCivilDate(value: string): boolean {
  return CIVIL_DATE.test(value);
}

/**
 * Simplified query fingerprint: sha256 over the normalized filters plus the
 * newest source revision read in the snapshot transaction. A changed source
 * between totals and detail produces a different fingerprint (409).
 * Per-record revision tracking is a documented evolution, not this prototype.
 */
export function computeQueryFingerprint(
  report: string,
  filters: Record<string, string | undefined>,
  maxRevision: string,
): string {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) normalized[key] = value;
  }
  return createHash("sha256").update(stableStringify({ filters: normalized, maxRevision, report })).digest("hex");
}
