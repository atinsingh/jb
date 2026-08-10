/**
 * Shared shapes for the ATS compatibility checker.
 *
 * Two deliberately separate questions live here, and they must not be
 * conflated (see docs/superpowers/specs/2026-08-09-ats-compatibility-checker-spec.md):
 *
 *   1. "Will a parser read my resume at all?"  -> AtsCheckResult, deterministic,
 *      a property of the document alone, stored on the resume.
 *   2. "Does this resume match this job?"      -> AtsMatchResult, a property of a
 *      pairing, recomputed per request and never persisted.
 */

export type AtsSeverity = 'critical' | 'warning' | 'info';

/**
 * A single thing a parser will trip over. `fix` is mandatory by design: a
 * finding the candidate cannot act on ("poor formatting") is noise, not advice.
 */
export interface AtsFinding {
  code: string;
  severity: AtsSeverity;
  /** What the parser sees, in the candidate's terms. */
  message: string;
  /** The concrete edit that resolves it. */
  fix: string;
}

/** The generic, document-only result. Pure output of AtsParseabilityService. */
export interface AtsCheckResult {
  score: number;
  findings: AtsFinding[];
  /**
   * Length only — never the text itself. Resume content is personal data and
   * the stored report must not become a second copy of it.
   */
  extractedTextLength: number;
}

/** What gets persisted on Resume.atsReport (the result plus a timestamp). */
export interface AtsReport extends AtsCheckResult {
  checkedAt: Date;
}

/**
 * One visual line of a PDF, with the horizontal offset of each run of text.
 * Column and table detection are geometric facts, so they need coordinates —
 * flattened text has already thrown that information away.
 */
export interface AtsLayoutLine {
  y: number;
  segments: Array<{ x: number; text: string }>;
}

export interface AtsLayout {
  lines: AtsLayoutLine[];
  pageWidth: number;
  pageCount: number;
}

/**
 * The builder's own resume document. Structural questions ("is there an
 * experience section?") are answered from these fields directly rather than by
 * pattern-matching prose, which would just re-derive what we already know.
 */
export interface AtsStructuredResume {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  website?: string;
  github?: string;
  headline?: string;
  summary?: string;
  profileSummary?: string;
  skills?: string[];
  experience?: Array<{
    title?: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    description?: string;
    achievements?: string[];
  }>;
  education?: Array<{
    degree?: string;
    institution?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  certifications?: Array<{ name?: string; issuer?: string; date?: string }>;
  projects?: Array<{ name?: string; description?: string; technologies?: string[] }>;
}

/**
 * At least one of these must be supplied. `structured` is the builder path,
 * `text`/`layout` the uploaded-document path. Supplying nothing is itself a
 * meaningful answer: a resume with no extractable text scores 0.
 */
export interface AtsCheckInput {
  text?: string;
  layout?: AtsLayout;
  structured?: AtsStructuredResume;
}

/** JD-relative coverage. Ephemeral — returned to the caller, never stored. */
export interface AtsMatchResult {
  /** Percentage of JD keywords the resume evidences, 0-100. */
  coverage: number;
  matched: string[];
  missing: string[];
  /** How many distinct concepts the JD asked for; 0 means nothing to match. */
  keywordCount: number;
}
