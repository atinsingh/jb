/**
 * Grounding enforcement for generated résumés.
 *
 * The rule: a generator may reorganise, rephrase, re-order and re-emphasise
 * facts that exist in the source. It may never introduce an employer, a job
 * title, an employment date, or a metric that is not already there.
 *
 * This is not a prompt instruction. Prompts are requests; a candidate walking
 * into an interview holding a document they cannot defend is a real harm, so
 * the constraint is enforced on the OUTPUT, after the model has spoken. Same
 * posture as the answer engine's attestation rule.
 *
 * Pure functions, no I/O — the rule is the part most worth testing.
 */

export interface SourceExperience {
  title?: string;
  company?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  achievements?: string[];
  [key: string]: any;
}

export interface SourceFacts {
  companies: Set<string>;
  titles: Set<string>;
  /** Every digit-run present anywhere in the source, for metric checking. */
  numbers: Set<string>;
  /** Flattened source text, lowercased. */
  text: string;
}

const norm = (s: unknown): string =>
  String(s ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Every digit-run in a string: "increased by 40% over 3 years" -> 40, 3. */
export function extractNumbers(text: string): string[] {
  return (String(text ?? '').match(/\d+(?:[.,]\d+)?/g) || []).map((n) => n.replace(/,/g, ''));
}

/** Collect the facts a generated résumé is allowed to draw on. */
export function extractSourceFacts(source: {
  experience?: SourceExperience[];
  education?: any[];
  skills?: string[];
  summary?: string;
  [key: string]: any;
}): SourceFacts {
  const companies = new Set<string>();
  const titles = new Set<string>();

  for (const e of source?.experience || []) {
    if (e?.company) companies.add(norm(e.company));
    if (e?.title) titles.add(norm(e.title));
  }

  const parts: string[] = [];
  const walk = (value: any) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'string' || typeof value === 'number') {
      parts.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(source);

  const text = norm(parts.join(' '));
  return { companies, titles, numbers: new Set(extractNumbers(text)), text };
}

export interface GroundingViolation {
  kind: 'employer' | 'title' | 'date' | 'metric';
  value: string;
  where: string;
}

export interface GroundingResult<T> {
  /** The output with ungrounded experience entries removed. */
  kept: T;
  violations: GroundingViolation[];
}

/**
 * Strip any generated experience entry whose employer or title does not appear
 * in the source, and report every violation found.
 *
 * Removal rather than correction is deliberate: an entry naming an employer the
 * candidate never worked for cannot be repaired, only deleted.
 */
export function enforceExperienceGrounding(
  generated: SourceExperience[] | undefined,
  facts: SourceFacts,
): GroundingResult<SourceExperience[]> {
  const violations: GroundingViolation[] = [];
  const kept: SourceExperience[] = [];

  for (const entry of generated || []) {
    const company = norm(entry?.company);
    const title = norm(entry?.title);
    let ok = true;

    if (company && !facts.companies.has(company)) {
      violations.push({ kind: 'employer', value: String(entry.company), where: 'experience' });
      ok = false;
    }
    if (title && !facts.titles.has(title)) {
      violations.push({ kind: 'title', value: String(entry.title), where: 'experience' });
      ok = false;
    }

    // Dates must appear in the source text somewhere. A generator that shifts a
    // tenure by a year has changed a fact, not the phrasing.
    for (const field of ['startDate', 'endDate'] as const) {
      const value = norm(entry?.[field]);
      if (value && !facts.text.includes(value)) {
        violations.push({ kind: 'date', value: String(entry[field]), where: `experience.${field}` });
        ok = false;
      }
    }

    if (ok) kept.push(entry);
  }

  return { kept, violations };
}

/**
 * Report figures in generated prose that have no origin in the source.
 *
 * "Increased activation 31%" is indefensible if 31 appears nowhere in the
 * candidate's own material. Reported rather than silently stripped, because
 * removing a number mid-sentence usually produces nonsense — the caller decides
 * whether to drop the sentence or ask the candidate.
 */
export function findFabricatedMetrics(
  generatedText: string,
  facts: SourceFacts,
  where = 'summary',
): GroundingViolation[] {
  return extractNumbers(generatedText)
    .filter((n) => !facts.numbers.has(n))
    .map((value) => ({ kind: 'metric' as const, value, where }));
}

/** The instruction given to the model. The check above is what enforces it. */
export const GROUNDING_SYSTEM_PROMPT =
  'You rewrite résumés. You may reorganise, rephrase, re-order and re-emphasise ' +
  'the facts you are given. You must NEVER introduce an employer, job title, ' +
  'employment date, qualification, or numeric metric that does not appear in the ' +
  'supplied material. If the candidate has no evidence for something the job asks ' +
  'for, omit it — do not invent it, and do not imply it. Return only the requested content.';
