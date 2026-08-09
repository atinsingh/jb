/**
 * Target-country resolution.
 *
 * Jobocate models three distinct geographic concepts and they must never be
 * conflated:
 *
 *   - WHERE THE CANDIDATE WANTS TO WORK -> `JobProfile.targetCountries`
 *     Filters the job pool and gates auto-apply.
 *   - WHERE THEY MAY LEGALLY WORK       -> `UserPreferences.workAuthCountries`
 *     Drives sponsorship reasoning.
 *   - WHERE THEY CURRENTLY ARE          -> `UserPreferences.country`
 *     Relocation / commute context only.
 *
 * Before target countries existed the pool was filtered by the candidate's
 * CURRENT country, so someone in India looking for work in Canada could only
 * ever see Indian and globally-remote roles. `resolveTargetCountries` is the
 * single place that decides which countries a search is for.
 */

const ISO2 = /^[A-Z]{2}$/;

/** Normalize one code to a validated ISO2, or null. */
function toIso2(value: unknown): string | null {
  const code = String(value ?? '')
    .trim()
    .toUpperCase();
  return ISO2.test(code) ? code : null;
}

export interface TargetCountrySource {
  targetCountries?: string[] | null;
}

export interface CurrentCountrySource {
  country?: string | null;
}

/**
 * Resolve the ISO2 countries a search targets.
 *
 * Falls back to the candidate's current country when the profile states no
 * target, so every profile that predates this field keeps its previous
 * behaviour until a target is actually set.
 *
 * @returns de-duplicated ISO2 codes; empty when neither source yields one
 *          (callers must treat empty as "no geo filter", not "match nothing").
 */
export function resolveTargetCountries(
  profile?: TargetCountrySource | null,
  prefs?: CurrentCountrySource | null,
): string[] {
  const explicit = (profile?.targetCountries ?? [])
    .map(toIso2)
    .filter((c): c is string => c !== null);

  if (explicit.length) return Array.from(new Set(explicit));

  const current = toIso2(prefs?.country);
  return current ? [current] : [];
}

/**
 * True when `country` is one the candidate is targeting.
 *
 * An empty target list means "unfiltered", so an unknown or absent country is
 * permitted rather than excluded — the caller decides how strict to be.
 */
export function isTargetedCountry(
  country: string | null | undefined,
  targets: string[],
): boolean {
  if (!targets.length) return true;
  const code = toIso2(country);
  if (!code) return true; // undeterminable country — don't exclude on a guess
  return targets.includes(code);
}
