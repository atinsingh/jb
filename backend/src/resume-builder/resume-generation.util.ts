/**
 * Pure, dependency-free helpers behind `POST /resume-builder/generate` and
 * `POST /resume-builder/generate/section`.
 *
 * WHY a separate file: the grounding rule — "never introduce an employer,
 * title, date, qualification or metric that isn't already in the
 * candidate's own facts" — has to be enforced in code, not just requested in
 * a prompt. An LLM can and will comply with instructions embedded in a job
 * description that was pasted in by a stranger. Keeping the enforcement in
 * small, pure, independently-testable functions (no Mongo, no HTTP, no LLM
 * client) means the guarantee can be unit-tested directly against
 * adversarial input, without mocking the world, and reused identically by
 * both `generate()` and `generateSection()` in resume-builder.service.ts.
 */

// ---------------------------------------------------------------- facts ---

export interface CandidateFactsExperience {
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  achievements: string[];
}

export interface CandidateFactsEducation {
  degree: string;
  institution: string;
  startDate?: string;
  endDate?: string;
}

export interface CandidateFacts {
  fullName?: string;
  headline?: string;
  summary?: string;
  skills: string[];
  experience: CandidateFactsExperience[];
  education: CandidateFactsEducation[];
}

/**
 * Loosely-typed source shape shared by both the Resume and User Mongoose
 * documents — their experience/education sub-schemas are field-for-field
 * identical (see schemas/resume.schema.ts and schemas/user.schema.ts), so one
 * normalizer covers both a saved résumé and a bare-profile fallback.
 */
export interface FactsSource {
  fullName?: string;
  name?: string;
  headline?: string;
  summary?: string;
  profileSummary?: string;
  skills?: string[];
  experience?: Array<{
    title?: string;
    company?: string;
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
  }>;
}

export function normalizeFacts(source: FactsSource | null | undefined): CandidateFacts {
  if (!source) {
    return { skills: [], experience: [], education: [] };
  }
  return {
    fullName: source.fullName || source.name || undefined,
    headline: source.headline || undefined,
    summary: source.summary || source.profileSummary || undefined,
    skills: Array.isArray(source.skills)
      ? source.skills.filter((s) => typeof s === 'string' && s.trim())
      : [],
    experience: Array.isArray(source.experience)
      ? source.experience
          .filter((e) => e && (e.company || e.title))
          .map((e) => ({
            company: e.company || 'Unknown',
            title: e.title || 'Unknown',
            startDate: e.startDate || '',
            endDate: e.endDate,
            current: e.current,
            description: e.description,
            achievements: Array.isArray(e.achievements)
              ? e.achievements.filter((a) => typeof a === 'string' && a.trim())
              : [],
          }))
      : [],
    education: Array.isArray(source.education)
      ? source.education
          .filter((e) => e && (e.degree || e.institution))
          .map((e) => ({
            degree: e.degree || '',
            institution: e.institution || '',
            startDate: e.startDate,
            endDate: e.endDate,
          }))
      : [],
  };
}

/** AC8: nothing to safely generate from — the caller must refuse rather than fabricate. */
export function hasUsableFacts(facts: CandidateFacts): boolean {
  return facts.experience.length > 0 || facts.skills.length > 0 || !!facts.summary;
}

// -------------------------------------------------------------- numbers ---

// Percentages, "2x"/"3.5x" multipliers, and plain/currency counts — the
// shapes résumé bullets actually use for quantified impact. Order matters:
// the suffixed alternatives (%, x) must be tried before the bare-number
// fallback so "40%" is captured as one token instead of leaving a stray "%".
const NUMBER_RE = /\$?\d[\d,]*(?:\.\d+)?%|\$?\d[\d,]*(?:\.\d+)?x\b|\$?\d[\d,]*(?:\.\d+)?/gi;

export function extractNumbers(text: string | null | undefined): string[] {
  if (!text) return [];
  const matches = text.match(NUMBER_RE) || [];
  return matches.map((n) => n.replace(/,/g, ''));
}

// ------------------------------------------------------------ org names ---

// Conservative proper-noun-plus-legal-suffix matcher, used to catch the most
// common shape of a hallucinated employer ("Definitely Fake Corp") inside
// free-text bullets. This is not real named-entity recognition — a
// deliberate, documented trade-off: false positives (stripping a legitimate
// third-party/vendor mention) are an acceptable cost for closing off the far
// worse failure mode, a fabricated employer reaching the candidate's résumé.
const ORG_SUFFIX_RE =
  /\b(?:[A-Z][\w&.'-]*\s+){0,3}[A-Z][\w&.'-]*\s+(?:Corp|Corporation|Inc|LLC|Ltd|Co|Group|Technologies|Systems|Labs|Solutions|Partners|Studios)\.?\b/g;

export function extractOrgMentions(text: string | null | undefined): string[] {
  if (!text) return [];
  return Array.from(text.matchAll(ORG_SUFFIX_RE)).map((m) => m[0]);
}

function normalizeOrg(s: string): string {
  return s.trim().toLowerCase().replace(/\.$/, '');
}

function mentionsUnknownOrg(text: string, knownOrgs: Set<string>): boolean {
  return extractOrgMentions(text).some((org) => !knownOrgs.has(normalizeOrg(org)));
}

// ------------------------------------------------------------- grounding ---

/**
 * Ground model-generated bullets against one experience entry's own source
 * text. A bullet is kept only if every number it contains already appears in
 * that entry's source achievements/description/dates, and it mentions no
 * organisation outside `knownOrgs`. Anything that fails either check falls
 * back to the corresponding original bullet (same index) — so a hallucinated
 * metric or employer can never reach the response, regardless of the prompt
 * and regardless of what the model actually did.
 */
export function groundBullets(
  modelBullets: unknown,
  source: CandidateFactsExperience,
  knownOrgs: Set<string>,
): string[] {
  const fallback = source.achievements.length
    ? source.achievements
    : source.description
      ? [source.description]
      : [];

  if (!Array.isArray(modelBullets) || modelBullets.length === 0) {
    return fallback;
  }

  // Dates are included so a bullet legitimately referencing this role's own
  // year(s) isn't punished as "ungrounded" just because that figure lives in
  // startDate/endDate rather than in prose.
  const sourceText = [
    source.description || '',
    ...source.achievements,
    source.startDate || '',
    source.endDate || '',
  ].join(' \n ');
  const sourceNumbers = new Set(extractNumbers(sourceText));

  const result: string[] = [];
  modelBullets.forEach((raw, i) => {
    const bullet = typeof raw === 'string' ? raw.trim() : '';
    if (!bullet) return;
    const ungroundedNumber = extractNumbers(bullet).some((n) => !sourceNumbers.has(n));
    const unknownOrg = mentionsUnknownOrg(bullet, knownOrgs);
    if (!ungroundedNumber && !unknownOrg) {
      result.push(bullet);
    } else if (fallback[i]) {
      result.push(fallback[i]);
    } else if (fallback.length) {
      result.push(fallback[i % fallback.length]);
    }
    // else: nothing safe to fall back to at this index — drop the bullet
    // rather than risk shipping an unverifiable claim.
  });

  return result.length ? result : fallback;
}

/**
 * A generated skills list may only ever be a reordered/filtered subset of
 * the candidate's own skills — never a superset. Degenerate/unparseable
 * model output falls back to the full source list rather than an empty
 * section.
 */
export function groundSkills(modelSkills: unknown, sourceSkills: string[]): string[] {
  const normalize = (s: string) => s.trim().toLowerCase();
  const sourceByNorm = new Map(sourceSkills.map((s) => [normalize(s), s]));
  const seen = new Set<string>();
  const grounded: string[] = [];

  if (Array.isArray(modelSkills)) {
    for (const skill of modelSkills) {
      if (typeof skill !== 'string') continue;
      const match = sourceByNorm.get(normalize(skill));
      if (match && !seen.has(match)) {
        grounded.push(match);
        seen.add(match);
      }
    }
  }

  return grounded.length ? grounded : [...sourceSkills];
}

/**
 * Same grounding contract as `groundBullets`, applied to the free-text
 * summary paragraph: any ungrounded number or unrecognised organisation
 * discards the model's text in favour of the candidate's own existing
 * summary, or a plain fact-only sentence built solely from real
 * titles/skills if the candidate had no summary to begin with.
 */
export function groundSummary(
  modelSummary: unknown,
  facts: CandidateFacts,
  knownOrgs: Set<string>,
): string {
  const allSourceText = [
    facts.summary || '',
    ...facts.experience.flatMap((e) => [
      e.description || '',
      ...e.achievements,
      e.startDate || '',
      e.endDate || '',
    ]),
  ].join(' \n ');
  const sourceNumbers = new Set(extractNumbers(allSourceText));

  const candidate = typeof modelSummary === 'string' ? modelSummary.trim() : '';
  const ungroundedNumber = !!candidate && extractNumbers(candidate).some((n) => !sourceNumbers.has(n));
  const unknownOrg = !!candidate && mentionsUnknownOrg(candidate, knownOrgs);

  if (candidate && !ungroundedNumber && !unknownOrg) {
    return candidate;
  }

  if (facts.summary) return facts.summary;
  const latestTitle = facts.experience[0]?.title;
  const topSkills = facts.skills.slice(0, 3).join(', ');
  if (latestTitle && topSkills) return `${latestTitle} with hands-on experience in ${topSkills}.`;
  if (latestTitle) return `${latestTitle}.`;
  if (topSkills) return `Experienced in ${topSkills}.`;
  return '';
}

// -------------------------------------------------------------- coverage ---

const STOPWORDS = new Set([
  'and', 'the', 'with', 'for', 'years', 'year', 'experience', 'strong',
  'ability', 'knowledge', 'working', 'a', 'an', 'of', 'to', 'in', 'or',
  'plus', 'is', 'are', 'have', 'has', 'this', 'that', 'you', 'will', 'we',
]);

export interface CoverageResult {
  percentage: number;
  matched: string[];
  missing: string[];
}

/**
 * Deterministic, code-driven coverage check — never the model's own
 * self-report. A requirement counts as evidenced only if its phrase (or
 * every one of its significant words) already appears somewhere in the
 * candidate's own facts. This is what keeps `coverage` honest per the spec's
 * business rule: a gap is reported as a gap, not papered over.
 */
export function computeCoverage(requirements: string[], facts: CandidateFacts): CoverageResult {
  const haystack = [
    facts.summary || '',
    ...facts.skills,
    ...facts.experience.flatMap((e) => [e.title, e.company, e.description || '', ...e.achievements]),
  ]
    .join(' \n ')
    .toLowerCase();

  const matched: string[] = [];
  const missing: string[] = [];

  for (const raw of requirements) {
    const req = (raw || '').trim();
    if (!req) continue;
    const needle = req.toLowerCase();
    const words = needle.split(/[^a-z0-9+.#]+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
    const covered =
      haystack.includes(needle) || (words.length > 0 && words.every((w) => haystack.includes(w)));
    (covered ? matched : missing).push(req);
  }

  const total = matched.length + missing.length;
  return {
    percentage: total ? Math.round((matched.length / total) * 100) : 0,
    matched,
    missing,
  };
}

/**
 * Deterministic fallback requirement-phrase extractor, used only when the
 * model's JSON is missing/malformed `requirements`. Reads the job
 * description's own list-formatted lines back to itself — it never touches
 * candidate facts, so it carries no fabrication risk either way.
 */
export function extractRequirementPhrases(jobDescription: string | null | undefined, max = 8): string[] {
  if (!jobDescription) return [];
  const rawLines = jobDescription.split(/\r?\n/);
  const bulletish = rawLines
    .filter((l) => /^\s*[-*••]|^\s*\d+[.)]/.test(l))
    .map((l) => l.replace(/^[\s*•\-•\d.)]+/, '').trim());

  const pool = bulletish.length ? bulletish : rawLines.map((l) => l.trim()).filter((l) => l.length > 0);

  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of pool) {
    const clean = line.replace(/[.:;]+$/, '').trim();
    if (clean.length < 2 || clean.length > 120) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
    if (result.length >= max) break;
  }
  return result;
}

// ------------------------------------------------------------- LLM json ---

/**
 * Parse a model's JSON response, tolerating a fenced ```json code block —
 * mirrors the defensive parsing already used by ResumeTailoringService /
 * BulletRewriteService. Returns {} (never throws) on total failure so
 * generation degrades to an all-source-derived result instead of crashing:
 * malformed model output is not the same failure mode as a down provider
 * (that one is handled by the caller's try/catch around provider.chat()).
 */
export function parseModelJson(content: string | null | undefined): Record<string, any> {
  if (!content) return {};
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        return {};
      }
    }
    return {};
  }
}
