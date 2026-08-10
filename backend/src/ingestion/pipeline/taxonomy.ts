/**
 * Controlled taxonomies for normalization (spec §5).
 *
 * Deterministic maps that collapse inconsistent source labels into canonical
 * values, rather than allowing unlimited free-text variants. Kept as plain data
 * so they are trivially unit-testable and extendable without code changes.
 */

/** Canonical employment types (mirror the Job.jobType enum). */
export function normalizeEmploymentType(raw?: string): string | undefined {
  if (!raw) return undefined;
  const s = raw
    .toLowerCase()
    .replace(/[_\s-]+/g, ' ')
    .trim();
  const map: Record<string, string> = {
    'full time': 'Full-time',
    fulltime: 'Full-time',
    ft: 'Full-time',
    permanent: 'Full-time',
    'part time': 'Part-time',
    parttime: 'Part-time',
    pt: 'Part-time',
    contract: 'Contract',
    contractor: 'Contract',
    freelance: 'Contract',
    temporary: 'Temporary',
    temp: 'Temporary',
    internship: 'Internship',
    intern: 'Internship',
  };
  return map[s];
}

/** Canonical workplace type. */
export function normalizeWorkplaceType(
  raw?: string,
  remoteFlag?: boolean,
): string | undefined {
  if (remoteFlag) return 'remote';
  if (!raw) return undefined;
  const s = raw.toLowerCase();
  if (/\bremote\b|telecommute|work from home|wfh|anywhere/.test(s))
    return 'remote';
  if (/\bhybrid\b|flexible/.test(s)) return 'hybrid';
  if (/\bon-?site\b|in-?office|in person/.test(s)) return 'onsite';
  return undefined;
}

/** Infer remote from a free-text location/title if not explicit. */
export function inferRemote(text?: string): boolean {
  if (!text) return false;
  return /\bremote\b|telecommute|work from home|\bwfh\b|fully remote/i.test(
    text,
  );
}

/** Canonical seniority band. */
export function normalizeSeniority(
  raw?: string,
  title?: string,
): string | undefined {
  const hay = `${raw || ''} ${title || ''}`.toLowerCase();
  if (!hay.trim()) return undefined;
  if (/\bintern(ship)?\b/.test(hay)) return 'Internship';
  if (/\bprincipal\b|\bstaff\b|\bdistinguished\b/.test(hay)) return 'Principal';
  if (/\b(lead|head|director|vp|chief|manager)\b/.test(hay)) return 'Lead';
  if (/\bsenior\b|\bsr\.?\b/.test(hay)) return 'Senior';
  if (/\bjunior\b|\bjr\.?\b|\bentry\b|\bgraduate\b|\bassociate\b/.test(hay))
    return 'Entry';
  if (/\bmid\b|\bintermediate\b/.test(hay)) return 'Mid';
  return undefined;
}

/** Canonical salary period. */
export function normalizeSalaryPeriod(raw?: string): string | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase();
  if (/year|annual|\/yr|per year|pa\b|annum/.test(s)) return 'year';
  if (/month|\/mo|per month/.test(s)) return 'month';
  if (/week|\/wk|per week/.test(s)) return 'week';
  if (/\bday\b|\/day|per day|daily/.test(s)) return 'day';
  if (/hour|\/hr|per hour|hourly/.test(s)) return 'hour';
  return undefined;
}

/** Normalize a currency symbol/word to an ISO-ish code. */
export function normalizeCurrency(raw?: string): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim().toUpperCase();
  const map: Record<string, string> = {
    $: 'USD',
    US$: 'USD',
    USD: 'USD',
    '€': 'EUR',
    EUR: 'EUR',
    '£': 'GBP',
    GBP: 'GBP',
    '₹': 'INR',
    INR: 'INR',
    CAD: 'CAD',
    AUD: 'AUD',
  };
  return map[s] || (/^[A-Z]{3}$/.test(s) ? s : undefined);
}

/**
 * Title normalization: strip seniority prefixes, level suffixes, and req-ids to a
 * comparable base title (used for dedup + display). Keeps it conservative — never
 * changes the actual role.
 */
export function normalizeTitle(raw?: string): string | undefined {
  if (!raw) return undefined;
  let t = raw
    .replace(/\(.*?\)/g, ' ') // drop parentheticals
    .replace(/\b(req|requisition|job)\s*#?\s*\d+\b/gi, ' ') // req ids
    .replace(
      /[|/–—-]\s*(remote|hybrid|onsite|full[- ]?time|part[- ]?time).*/i,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  t = t.replace(/^\s*(senior|sr\.?|junior|jr\.?|lead|principal|staff)\s+/i, '');
  return t || undefined;
}

/** Company-name normalization for dedup: lowercase, strip legal suffixes/punct. */
export function normalizeCompany(raw?: string): string | undefined {
  if (!raw) return undefined;
  const t = raw
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(
      /\b(inc|llc|ltd|limited|corp|corporation|gmbh|co|company|plc|sa|ag|bv)\b/g,
      ' ',
    )
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t || undefined;
}

/** Skill synonym canonicalization (small, extendable). */
const SKILL_SYNONYMS: Record<string, string> = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  reactjs: 'React',
  'react.js': 'React',
  react: 'React',
  nodejs: 'Node.js',
  'node.js': 'Node.js',
  node: 'Node.js',
  postgres: 'PostgreSQL',
  postgresql: 'PostgreSQL',
  k8s: 'Kubernetes',
  kubernetes: 'Kubernetes',
  golang: 'Go',
};

export function normalizeSkill(raw: string): string {
  const key = raw.trim().toLowerCase();
  return SKILL_SYNONYMS[key] || raw.trim();
}

export function normalizeSkills(skills?: string[]): string[] {
  if (!skills || !skills.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of skills) {
    const norm = normalizeSkill(s);
    const key = norm.toLowerCase();
    if (norm && !seen.has(key)) {
      seen.add(key);
      out.push(norm);
    }
  }
  return out;
}

/** Parse a "$120,000 - $150,000 per year" style string into structured parts. */
export function parseSalaryText(text?: string): {
  min?: number;
  max?: number;
  currency?: string;
  period?: string;
} {
  if (!text) return {};
  const currency = normalizeCurrency(
    (text.match(/[$€£₹]|USD|EUR|GBP|INR|CAD|AUD/i) || [])[0],
  );
  const period = normalizeSalaryPeriod(text);
  // Support "80k" style and comma-grouped numbers.
  const nums = (text.match(/\d[\d,]*\.?\d*\s*[kK]?/g) || [])
    .map((n) => {
      const isK = /k/i.test(n);
      const val = parseFloat(n.replace(/[,\skK]/g, ''));
      return isK ? val * 1000 : val;
    })
    .filter((n) => Number.isFinite(n) && n > 0);
  const min = nums.length ? Math.min(...nums) : undefined;
  const max = nums.length ? Math.max(...nums) : undefined;
  return { min, max, currency, period };
}
