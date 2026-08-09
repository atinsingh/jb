/**
 * Centralized geography reference data + enums for the eligibility engine.
 * Country logic lives HERE, never scattered through the codebase.
 */

export enum WorkplaceType {
  ONSITE = 'ONSITE',
  HYBRID = 'HYBRID',
  REMOTE = 'REMOTE',
  FIELD_BASED = 'FIELD_BASED',
  UNSPECIFIED = 'UNSPECIFIED',
}

export enum RemoteScope {
  CITY_ONLY = 'CITY_ONLY',
  REGION_ONLY = 'REGION_ONLY',
  COUNTRY_ONLY = 'COUNTRY_ONLY',
  MULTI_COUNTRY = 'MULTI_COUNTRY',
  TIMEZONE_RESTRICTED = 'TIMEZONE_RESTRICTED',
  GLOBAL = 'GLOBAL',
  UNSPECIFIED = 'UNSPECIFIED',
}

export enum SponsorshipPolicy {
  AVAILABLE = 'AVAILABLE',
  NOT_AVAILABLE = 'NOT_AVAILABLE',
  CASE_BY_CASE = 'CASE_BY_CASE',
  NOT_SPECIFIED = 'NOT_SPECIFIED',
}

export enum EligibilityStatus {
  ELIGIBLE = 'ELIGIBLE',
  CONDITIONALLY_ELIGIBLE = 'CONDITIONALLY_ELIGIBLE',
  INELIGIBLE = 'INELIGIBLE',
  UNKNOWN = 'UNKNOWN',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
}

export enum ReasonCode {
  JOB_EXPIRED = 'JOB_EXPIRED',
  JOB_LOW_CONFIDENCE = 'JOB_LOW_CONFIDENCE',
  COUNTRY_NOT_SUPPORTED = 'COUNTRY_NOT_SUPPORTED',
  REGION_NOT_SUPPORTED = 'REGION_NOT_SUPPORTED',
  REMOTE_NOT_GLOBAL = 'REMOTE_NOT_GLOBAL',
  OUTSIDE_COMMUTING_RANGE = 'OUTSIDE_COMMUTING_RANGE',
  HYBRID_ATTENDANCE_NOT_POSSIBLE = 'HYBRID_ATTENDANCE_NOT_POSSIBLE',
  WORK_AUTHORIZATION_REQUIRED = 'WORK_AUTHORIZATION_REQUIRED',
  SPONSORSHIP_NOT_AVAILABLE = 'SPONSORSHIP_NOT_AVAILABLE',
  RELOCATION_REQUIRED = 'RELOCATION_REQUIRED',
  RELOCATION_NOT_SUPPORTED = 'RELOCATION_NOT_SUPPORTED',
  COMPENSATION_BELOW_MINIMUM = 'COMPENSATION_BELOW_MINIMUM',
  EMPLOYER_EXCLUDED = 'EMPLOYER_EXCLUDED',
  TITLE_EXCLUDED = 'TITLE_EXCLUDED',
  CANDIDATE_PREFERENCE_MISMATCH = 'CANDIDATE_PREFERENCE_MISMATCH',
  INSUFFICIENT_JOB_INFORMATION = 'INSUFFICIENT_JOB_INFORMATION',
  COUNTRY_ELIGIBLE = 'COUNTRY_ELIGIBLE',
  REMOTE_GLOBAL = 'REMOTE_GLOBAL',
  SAME_REGION = 'SAME_REGION',
}

export type Severity = 'hard' | 'soft' | 'info';

// ISO2 -> canonical display name + aliases (compact, extend as needed).
export const COUNTRIES: Record<string, { name: string; aliases: string[] }> = {
  US: { name: 'United States', aliases: ['usa', 'u.s.', 'u.s.a', 'united states', 'united states of america', 'america', 'stateside'] },
  CA: { name: 'Canada', aliases: ['canada', 'can'] },
  GB: { name: 'United Kingdom', aliases: ['uk', 'u.k', 'united kingdom', 'england', 'scotland', 'wales', 'britain', 'great britain'] },
  IN: { name: 'India', aliases: ['india', 'bharat'] },
  IE: { name: 'Ireland', aliases: ['ireland'] },
  DE: { name: 'Germany', aliases: ['germany', 'deutschland'] },
  FR: { name: 'France', aliases: ['france'] },
  NL: { name: 'Netherlands', aliases: ['netherlands', 'holland'] },
  ES: { name: 'Spain', aliases: ['spain'] },
  PT: { name: 'Portugal', aliases: ['portugal'] },
  PL: { name: 'Poland', aliases: ['poland'] },
  AU: { name: 'Australia', aliases: ['australia'] },
  NZ: { name: 'New Zealand', aliases: ['new zealand'] },
  SG: { name: 'Singapore', aliases: ['singapore'] },
  JP: { name: 'Japan', aliases: ['japan'] },
  BR: { name: 'Brazil', aliases: ['brazil', 'brasil'] },
  MX: { name: 'Mexico', aliases: ['mexico'] },
  AE: { name: 'United Arab Emirates', aliases: ['uae', 'united arab emirates', 'dubai', 'abu dhabi'] },
};

// US state codes + names -> country US
export const US_STATES = new Set([
  'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il', 'in', 'ia', 'ks',
  'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj', 'nm', 'ny',
  'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy',
  'california', 'new york', 'texas', 'washington', 'massachusetts', 'illinois', 'georgia', 'florida',
  'colorado', 'oregon', 'virginia', 'north carolina', 'pennsylvania', 'ohio', 'michigan', 'arizona', 'utah',
]);

// Canadian province codes + names -> country CA
export const CA_PROVINCES = new Set([
  'on', 'qc', 'bc', 'ab', 'mb', 'sk', 'ns', 'nb', 'nl', 'pe', 'nt', 'yt', 'nu',
  'ontario', 'quebec', 'british columbia', 'alberta', 'manitoba', 'saskatchewan', 'nova scotia',
  'new brunswick', 'newfoundland', 'prince edward island', 'toronto', 'vancouver', 'montreal', 'ottawa', 'calgary',
]);

/** Resolve a free-text token/phrase to an ISO2 country code, or null. */
export function resolveCountry(text?: string): string | null {
  if (!text) return null;
  const t = text.toLowerCase().trim();
  for (const [iso, meta] of Object.entries(COUNTRIES)) {
    if (t === iso.toLowerCase()) return iso;
    if (meta.aliases.some((a) => new RegExp(`(^|[^a-z])${a.replace(/\./g, '\\.')}([^a-z]|$)`, 'i').test(t))) return iso;
  }
  // State / province inference
  const tokens = t.split(/[,/|]/).map((x) => x.trim());
  for (const tok of tokens) {
    if (US_STATES.has(tok)) return 'US';
    if (CA_PROVINCES.has(tok)) return 'CA';
  }
  return null;
}

export const countryName = (iso?: string | null) => (iso && COUNTRIES[iso]?.name) || iso || 'Unknown';
