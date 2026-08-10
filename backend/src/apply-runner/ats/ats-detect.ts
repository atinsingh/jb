/**
 * ATS-type detection for the headless auto-apply runner.
 *
 * Mirrors the browser extension's `jobocateDetectAts()`
 * (extension/selectors.js) hostname logic, extended with Workday so the
 * server-side runner can pick the right adapter. Keep the two in sync when
 * adding new ATS hostnames.
 */

export type AtsType = 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'unknown';

/**
 * Detect the ATS from an apply URL by inspecting its hostname.
 *
 *   greenhouse.io                    -> 'greenhouse'
 *   lever.co                         -> 'lever'
 *   ashbyhq.com                      -> 'ashby'
 *   myworkdayjobs.com / *workday*    -> 'workday'
 *   anything else / unparseable      -> 'unknown'
 *
 * Never throws — a missing/garbage URL resolves to 'unknown'.
 */
export function detectAtsType(applyUrl: string | null | undefined): AtsType {
  if (!applyUrl || typeof applyUrl !== 'string') return 'unknown';

  let hostname: string;
  try {
    hostname = new URL(applyUrl).hostname.toLowerCase();
  } catch {
    // Fall back to a raw substring scan for non-absolute / malformed inputs.
    hostname = applyUrl.toLowerCase();
  }

  if (hostname.includes('greenhouse.io')) return 'greenhouse';
  if (hostname.includes('lever.co')) return 'lever';
  if (hostname.includes('ashbyhq.com') || hostname.includes('ashby.hq')) return 'ashby';
  if (hostname.includes('myworkdayjobs') || hostname.includes('workday')) {
    return 'workday';
  }
  return 'unknown';
}

/**
 * Minimal shape of the fields on a Job that can hold an apply URL. Mirrors the
 * real field names on `schemas/job.schema.ts`.
 */
export interface ApplyUrlSource {
  originalApplyUrl?: string;
  externalUrl?: string;
  sourceUrl?: string;
  canonicalUrl?: string;
}

/**
 * Resolve the best apply URL for a job, in precedence order:
 *   originalApplyUrl -> externalUrl -> sourceUrl -> canonicalUrl
 * Returns the first non-empty value, or null when the job has none.
 */
export function resolveApplyUrl(job: ApplyUrlSource | null | undefined): string | null {
  if (!job) return null;
  const candidates = [
    job.originalApplyUrl,
    job.externalUrl,
    job.sourceUrl,
    job.canonicalUrl,
  ];
  for (const url of candidates) {
    if (typeof url === 'string' && url.trim()) return url.trim();
  }
  return null;
}
