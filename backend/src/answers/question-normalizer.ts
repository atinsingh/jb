import { createHash } from 'crypto';
import { resolveCountry } from '../geography/geo.constants';

/**
 * Question normalization.
 *
 * An answer is only reusable if the same question can be RECOGNISED again on a
 * different company's form, worded differently. "Are you legally authorized to
 * work in the United States?" and "Do you have US work authorization?" must
 * collapse to one key, or the answer bank never stops asking.
 *
 * Deliberately deterministic: lowercase, strip markup and punctuation, drop the
 * company name, remove a small stopword set, collapse whitespace. No model is
 * involved here. Classification (which is semantic) happens downstream in
 * question-classifier; this stage only produces a stable key.
 */

/**
 * Words removed before keying. Kept small and boring on purpose — each entry
 * merges questions that differ only by politeness or hedging, and nothing else.
 * `legally` and `currently` are included so "are you legally authorized" and
 * "are you authorized" collapse, which is the desired merge.
 */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'to', 'for', 'in', 'on', 'at', 'by', 'with',
  'your', 'you', 'yours', 'our', 'we',
  // NOTE: 'us' is deliberately NOT a stopword. On application forms it is
  // overwhelmingly the country ("US work authorization"), not the pronoun, and
  // dropping it silently destroyed the country signal.
  'do', 'does', 'did', 'are', 'is', 'was', 'were', 'be', 'been', 'being',
  'will', 'would', 'can', 'could', 'shall', 'should', 'may', 'might',
  'have', 'has', 'had',
  'any', 'please', 'kindly', 'currently', 'legally', 'this', 'that',
  'if', 'or', 'and',
]);

/** Trailing noise ATS forms add to labels. */
const LABEL_NOISE = /\s*(\*|\(required\)|\(optional\)|required|optional)\s*$/gi;

/**
 * Shorthand country tokens common on application forms but absent from the
 * shared geo aliases. Those aliases are tuned for JOB LOCATIONS, where adding
 * bare "us" would misfire on copy like "come join us" — so the shorthand lives
 * here, scoped to question labels, rather than widening the global matcher.
 */
const COUNTRY_TOKEN_HINTS: Record<string, string> = {
  us: 'US',
  usa: 'US',
  uk: 'GB',
  uae: 'AE',
};

/** Blocs and regions that are NOT countries — never resolve one from these. */
const NON_COUNTRY_TOKENS = new Set(['eu', 'eea', 'emea', 'apac', 'latam', 'anywhere']);

/**
 * Country named by a bare token in the question, if any.
 *
 * Returns `undefined` to mean "keep looking" and `null` to mean "stop — this
 * question names a bloc, not a country", so a job asking about EU work rights
 * is not silently pinned to one member state.
 */
function countryFromTokens(cleaned: string): string | null | undefined {
  for (const token of cleaned.split(' ')) {
    if (NON_COUNTRY_TOKENS.has(token)) return null;
    if (COUNTRY_TOKEN_HINTS[token]) return COUNTRY_TOKEN_HINTS[token];
  }
  return undefined;
}

export interface NormalizedQuestion {
  /** Cleaned, stopword-stripped text used for matching. */
  normalized: string;
  /** Stable key derived from `normalized`. */
  key: string;
  /** ISO2 country named in the question, when there is one. */
  country: string | null;
  /** The original text, preserved for display and debugging. */
  raw: string;
}

/** Strip markup, entities and punctuation; lowercase; collapse whitespace. */
function clean(raw: string, companyName?: string): string {
  let text = String(raw || '');

  text = text.replace(/<[^>]*>/g, ' '); // markup
  text = text.replace(/&[a-z]+;|&#\d+;/gi, ' '); // entities
  text = text.replace(LABEL_NOISE, ' ');
  text = text.toLowerCase();

  // Drop the employer's own name — otherwise "why do you want to work at Acme?"
  // and the same question at Globex never match.
  const company = String(companyName || '').trim().toLowerCase();
  if (company.length > 2) {
    text = text.split(company).join(' ');
  }

  text = text.replace(/[^a-z0-9\s]/g, ' '); // punctuation
  return text.replace(/\s+/g, ' ').trim();
}

/** Remove stopwords, preserving order. */
function stripStopwords(text: string): string {
  return text
    .split(' ')
    .filter((w) => w && !STOPWORDS.has(w))
    .join(' ');
}

/**
 * Derive a stable key. Readable for the common case, hash-suffixed when the
 * question is long enough that truncation could collide.
 */
export function questionKeyFor(normalized: string): string {
  const slug = normalized.replace(/\s+/g, '-');
  if (!slug) return 'unknown';
  if (slug.length <= 80) return slug;

  const digest = createHash('sha1').update(normalized).digest('hex').slice(0, 8);
  return `${slug.slice(0, 71)}-${digest}`;
}

/**
 * Normalize one question label into a matchable form plus a stable key.
 *
 * @param raw         the verbatim label scraped from the form
 * @param companyName the employer, so their name does not enter the key
 */
export function normalizeQuestion(raw: string, companyName?: string): NormalizedQuestion {
  const cleaned = clean(raw, companyName);
  const normalized = stripStopwords(cleaned);

  // Country detection runs against the CLEANED text, not the stopword-stripped
  // one — "in the united states" still contains its country name, but a
  // stripped string can lose the article a matcher relies on. Bare shorthand
  // ("US", "UK") is checked first because the shared alias table omits it.
  const tokenCountry = countryFromTokens(cleaned);
  const country = tokenCountry !== undefined ? tokenCountry : resolveCountry(cleaned) || null;

  return {
    normalized,
    key: questionKeyFor(normalized),
    country,
    raw: String(raw || ''),
  };
}

/**
 * True when `pattern` (already normalized) identifies `question`.
 * Substring matching by design — a seeded pattern can never become a
 * catastrophic-backtracking regex.
 */
export function matchesPattern(question: NormalizedQuestion, pattern: string): boolean {
  const p = String(pattern || '').trim();
  if (!p) return false;
  return question.normalized.includes(p);
}
