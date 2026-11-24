export type ExtractedCustomSection = {
  heading: string;
  items: string[];
};

export type ExtractedResume = {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  headline?: string;
  summary?: string;
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
    location?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
    description?: string;
  }>;
  achievements?: string[];
  certifications?: Array<{
    name: string;
    issuer?: string;
    date?: string;
    expiryDate?: string;
    credentialId?: string;
    credentialUrl?: string;
  }>;
  projects?: Array<{
    name?: string;
    description?: string;
    technologies?: string[];
    url?: string;
    startDate?: string;
    endDate?: string;
  }>;
  languages?: Array<{
    language: string;
    proficiency?: string;
  }>;
  customSections?: ExtractedCustomSection[];
};

const ABSENT = ['summary', 'experience', 'skills', 'education', 'achievements', 'certifications', 'projects', 'languages'];
const SINGLE_CHAR_SKILLS = new Set(['c', 'r']);
const CANONICAL_HEADINGS = new Set([
  'summary', 'professional summary', 'profile', 'profile summary', 'objective', 'career objective', 'about', 'about me',
  'experience', 'work experience', 'professional experience', 'employment', 'employment history', 'work history',
  'skills', 'technical skills', 'core skills', 'key skills', 'core competencies', 'competencies',
  'education', 'academic background', 'academics',
  'achievements', 'accomplishments', 'awards',
  'certifications', 'certificates', 'licenses', 'licences',
  'projects', 'personal projects', 'selected projects',
  'languages',
]);

type SourceIndex = {
  raw: string;
  hay: string;
  tight: string;
  lineDigits: string[];
  hasCurrentKeyword: boolean;
};

function comparable(value: string): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/\u00ad/g, '')
    .replace(/([a-zA-Z])-\s*\r?\n\s*([a-zA-Z])/g, '$1$2')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u0088•·▪◦‣∙]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function tightComparable(value: string): string {
  return value.replace(/\s*([.,:;/@%()+-])\s*/g, '$1');
}

function buildSourceIndex(source: string): SourceIndex {
  const raw = String(source || '');
  const hay = comparable(raw);
  const tight = tightComparable(hay);
  const lineDigits = raw.split(/\r?\n/).map((line) => line.replace(/\D/g, '')).filter((digits) => digits.length >= 7);
  return {
    raw,
    hay,
    tight,
    lineDigits,
    hasCurrentKeyword: /\b(?:present|current|now)\b/i.test(raw),
  };
}

function clean(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/^[\u0088•·▪◦‣∙]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasBoundedMatch(haystack: string, needle: string, strictTechBoundary = false): boolean {
  if (!needle || !haystack) return false;
  const escaped = escapeRegex(needle);
  const boundary = strictTechBoundary ? '[^a-z0-9+#]' : '[^a-z0-9]';
  const startBoundary = /[a-z0-9]/.test(needle[0]) ? `(?:^|${boundary})` : '';
  const endBoundary = /[a-z0-9]/.test(needle[needle.length - 1]) ? `(?:$|${boundary})` : '';
  return new RegExp(`${startBoundary}${escaped}${endBoundary}`).test(haystack);
}

/** Keep a string only when the source résumé contains it. Single tokens must match whole words. */
function groundedString(value: unknown, idx: SourceIndex, allowSingleCharSkill = false): string {
  const text = clean(value);
  const needle = comparable(text);
  if (!needle) return '';
  if (needle.length === 1) {
    if (!allowSingleCharSkill || !SINGLE_CHAR_SKILLS.has(needle)) return '';
    return hasBoundedMatch(idx.hay, needle, true) ? text : '';
  }
  if (needle.includes(' ')) {
    if (hasBoundedMatch(idx.hay, needle)) return text;
    const tightNeedle = tightComparable(needle);
    return hasBoundedMatch(idx.tight, tightNeedle) ? text : '';
  }
  if (hasBoundedMatch(idx.hay, needle)) return text;
  const tightNeedle = tightComparable(needle);
  if (tightNeedle !== needle || /[.,:;/@%()+-]/.test(needle)) {
    return hasBoundedMatch(idx.tight, tightNeedle) ? text : '';
  }
  return '';
}

function groundedPhone(value: unknown, idx: SourceIndex): string {
  const exact = groundedString(value, idx);
  if (exact) return exact;
  const text = clean(value);
  const digits = text.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return '';
  return idx.lineDigits.some((line) => line.includes(digits)) ? text : '';
}

function groundedUrl(value: unknown, idx: SourceIndex): string {
  const text = clean(value);
  if (!text || /^(?:javascript|data|vbscript):/i.test(text)) return '';
  const exact = groundedString(text, idx);
  if (exact) return exact;
  const stripped = text.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');
  if (stripped.length < 4) return '';
  return groundedString(stripped, idx) ? text : '';
}

/** Keep the whole passage, or the lines/sentences from it that appear in the source. */
function groundedProse(value: unknown, idx: SourceIndex): string {
  const text = clean(value);
  if (!text) return '';
  if (groundedString(text, idx)) return text;
  if (text.endsWith('.') && groundedString(text.slice(0, -1), idx)) return text.slice(0, -1);
  return text
    .split(/(?:\r?\n)+|(?<=[.!?])\s+(?=[A-Z0-9"'“(])/)
    .map((sentence) => {
      const s = clean(sentence);
      if (!s) return '';
      if (groundedString(s, idx)) return s;
      if (s.endsWith('.') && groundedString(s.slice(0, -1), idx)) return s.slice(0, -1);
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => stringList(item));
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.includes('\n')) return trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return [trimmed];
  }
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((entry) => stringList(entry));
  }
  return [];
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = comparable(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function splitDateRange(value: unknown): { startDate?: string; endDate?: string } {
  const raw = clean(value);
  if (!raw) return {};
  const parts = raw.split(/\s*(?:–|—|\bto\b)\s*|\s+-\s+/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { startDate: parts[0], endDate: parts.slice(1).join(' - ') };
  return { startDate: raw };
}

function extractSkills(value: unknown, idx: SourceIndex): string[] {
  const rawItems = typeof value === 'string'
    ? value.split(/[,;|•·\n]+/).map((s) => s.trim()).filter(Boolean)
    : stringList(value).flatMap((item) =>
        item.includes(',') && item.length > 40 ? item.split(/[,;|•·]+/).map((s) => s.trim()) : [item],
      );
  return dedupeStrings(rawItems.map((item) => groundedString(item, idx, true)).filter(Boolean));
}

function extractCustomSections(value: unknown, idx: SourceIndex): ExtractedCustomSection[] {
  const entries: Array<{ heading: unknown; rawItems: unknown }> = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      entries.push({
        heading: obj.heading ?? obj.title ?? obj.name,
        rawItems: obj.items ?? obj.entries ?? obj.bullets ?? obj.content,
      });
    }
  } else if (value && typeof value === 'object') {
    for (const [heading, rawItems] of Object.entries(value as Record<string, unknown>)) {
      entries.push({ heading, rawItems });
    }
  }
  const seenHeadings = new Set<string>();
  const out: ExtractedCustomSection[] = [];
  for (const entry of entries) {
    const heading = groundedString(entry.heading, idx);
    if (!heading) continue;
    const key = comparable(heading);
    if (CANONICAL_HEADINGS.has(key) || seenHeadings.has(key)) continue;
    const items = dedupeStrings(
      stringList(entry.rawItems).map((line) => groundedProse(line, idx)).filter(Boolean),
    );
    if (!items.length) continue;
    seenHeadings.add(key);
    out.push({ heading, items });
  }
  return out;
}

export function groundResumeExtraction(raw: unknown, source: string): ExtractedResume {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const idx = buildSourceIndex(source);
  const out: ExtractedResume = {};

  for (const field of ['fullName', 'email', 'location', 'headline'] as const) {
    const kept = groundedString(value[field] ?? (field === 'fullName' ? value.name : undefined), idx);
    if (kept) out[field] = kept;
  }
  const phone = groundedPhone(value.phone, idx);
  if (phone) out.phone = phone;
  for (const field of ['linkedin', 'github', 'website'] as const) {
    const kept = groundedUrl(value[field], idx);
    if (kept) out[field] = kept;
  }

  const summary = groundedProse(value.summary ?? value.profileSummary, idx);
  if (summary) out.summary = summary;

  const skills = extractSkills(value.skills, idx);
  if (skills.length) out.skills = skills;

  if (Array.isArray(value.experience)) {
    const experience = value.experience
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const item = entry as Record<string, unknown>;
        const range = splitDateRange(item.dates ?? item.duration);
        const title = groundedString(item.title ?? item.role ?? item.jobTitle ?? item.position, idx);
        const company = groundedString(item.company ?? item.employer ?? item.organization ?? item.client, idx);
        const location = groundedString(item.location, idx);
        const startDate = groundedString(item.startDate ?? item.start ?? range.startDate, idx);
        const endDate = groundedString(item.endDate ?? item.end ?? range.endDate, idx);
        const current = Boolean(item.current) && (/\b(?:present|current|now)\b/i.test(endDate) || idx.hasCurrentKeyword);
        const rawBullets = item.achievements ?? item.bullets ?? item.highlights ?? item.responsibilities;
        const achievements = dedupeStrings(
          stringList(rawBullets).map((line) => groundedProse(line, idx)).filter(Boolean),
        );
        let description = groundedProse(item.description ?? item.summary, idx);
        if (description && achievements.length && comparable(description) === comparable(achievements.join(' '))) {
          description = '';
        }
        if (!title && !company && !description && !achievements.length) return null;
        return {
          ...(title ? { title } : {}),
          ...(company ? { company } : {}),
          ...(location ? { location } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
          ...(current ? { current: true } : {}),
          ...(description ? { description } : {}),
          ...(achievements.length ? { achievements } : {}),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);
    if (experience.length) out.experience = experience;
  }

  if (Array.isArray(value.education)) {
    const education = value.education
      .map((entry) => {
        if (typeof entry === 'string') {
          const degree = groundedProse(entry, idx);
          return degree ? { degree } : null;
        }
        if (!entry || typeof entry !== 'object') return null;
        const item = entry as Record<string, unknown>;
        const range = splitDateRange(item.dates ?? item.duration);
        const degree = groundedString(item.degree ?? item.qualification ?? item.program ?? item.field, idx);
        const institution = groundedString(item.institution ?? item.school ?? item.university ?? item.college, idx);
        const location = groundedString(item.location, idx);
        const startDate = groundedString(item.startDate ?? item.start ?? range.startDate, idx);
        const endDate = groundedString(item.endDate ?? item.end ?? item.graduationDate ?? item.year ?? range.endDate, idx);
        const gpa = groundedString(item.gpa, idx);
        const description = groundedProse(item.description, idx);
        if (!degree && !institution) return null;
        return {
          ...(degree ? { degree } : {}),
          ...(institution ? { institution } : {}),
          ...(location ? { location } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
          ...(gpa ? { gpa } : {}),
          ...(description ? { description } : {}),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);
    if (education.length) out.education = education;
  }

  const achievements = dedupeStrings(
    stringList(value.achievements).map((item) => groundedProse(item, idx)).filter(Boolean),
  );
  if (achievements.length) out.achievements = achievements;

  if (Array.isArray(value.certifications)) {
    const certifications = value.certifications
      .map((entry) => {
        if (typeof entry === 'string') {
          const name = groundedString(entry, idx);
          return name ? { name } : null;
        }
        if (!entry || typeof entry !== 'object') return null;
        const item = entry as Record<string, unknown>;
        const name = groundedString(item.name ?? item.title, idx);
        if (!name) return null;
        const issuer = groundedString(item.issuer ?? item.organization ?? item.authority, idx);
        const date = groundedString(item.date ?? item.issued ?? item.year, idx);
        const expiryDate = groundedString(item.expiryDate, idx);
        const credentialId = groundedString(item.credentialId, idx);
        const credentialUrl = groundedUrl(item.credentialUrl, idx);
        return {
          name,
          ...(issuer ? { issuer } : {}),
          ...(date ? { date } : {}),
          ...(expiryDate ? { expiryDate } : {}),
          ...(credentialId ? { credentialId } : {}),
          ...(credentialUrl ? { credentialUrl } : {}),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);
    if (certifications.length) out.certifications = certifications;
  }

  if (Array.isArray(value.projects)) {
    const projects = value.projects
      .map((entry) => {
        if (typeof entry === 'string') {
          const description = groundedProse(entry, idx);
          return description ? { description } : null;
        }
        if (!entry || typeof entry !== 'object') return null;
        const item = entry as Record<string, unknown>;
        const range = splitDateRange(item.dates ?? item.duration);
        const name = groundedString(item.name ?? item.title, idx);
        const description = groundedProse(
          item.description ?? item.summary ?? (Array.isArray(item.bullets) ? item.bullets.join(' ') : undefined),
          idx,
        );
        const technologies = extractSkills(item.technologies ?? item.skills ?? item.techStack, idx);
        const url = groundedUrl(item.url ?? item.link, idx);
        const startDate = groundedString(item.startDate ?? item.start ?? range.startDate, idx);
        const endDate = groundedString(item.endDate ?? item.end ?? range.endDate, idx);
        if (!name && !description) return null;
        return {
          ...(name ? { name } : {}),
          ...(description ? { description } : {}),
          ...(technologies.length ? { technologies } : {}),
          ...(url ? { url } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);
    if (projects.length) out.projects = projects;
  }

  if (Array.isArray(value.languages)) {
    const languages = value.languages
      .map((entry) => {
        if (typeof entry === 'string') {
          const language = groundedString(entry, idx);
          return language ? { language } : null;
        }
        if (!entry || typeof entry !== 'object') return null;
        const item = entry as Record<string, unknown>;
        const language = groundedString(item.language ?? item.name, idx);
        if (!language) return null;
        const proficiency = groundedString(item.proficiency ?? item.level, idx);
        return { language, ...(proficiency ? { proficiency } : {}) };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);
    if (languages.length) out.languages = languages;
  }

  const customSections = extractCustomSections(value.customSections, idx);
  if (customSections.length) out.customSections = customSections;

  return out;
}

/** Merge two already-grounded extractions, keeping earlier grounded fields when a later turn omits them. */
export function mergeExtractedResumes(base: ExtractedResume, next: ExtractedResume): ExtractedResume {
  const merged: ExtractedResume = { ...base };
  for (const [key, value] of Object.entries(next) as Array<[keyof ExtractedResume, unknown]>) {
    const usable = (typeof value === 'string' && value.trim().length > 0)
      || (Array.isArray(value) && value.length > 0);
    if (usable) (merged as Record<string, unknown>)[key] = value;
  }
  return merged;
}

/** Drop a section the agent called absent once its text was actually copied. */
export function absentAfterExtraction(reported: unknown, extracted: ExtractedResume): string[] {
  const filled = new Set<string>();
  if (extracted.summary) filled.add('summary');
  if (extracted.experience?.length) filled.add('experience');
  if (extracted.skills?.length) filled.add('skills');
  if (extracted.education?.length) filled.add('education');
  if (extracted.achievements?.length) filled.add('achievements');
  if (extracted.certifications?.length) filled.add('certifications');
  if (extracted.projects?.length) filled.add('projects');
  if (extracted.languages?.length) filled.add('languages');
  const seen = new Set<string>();
  const absent: string[] = [];
  for (const item of Array.isArray(reported) ? reported : []) {
    const section = String(item || '').trim().toLowerCase();
    if (!ABSENT.includes(section) || filled.has(section) || seen.has(section)) continue;
    seen.add(section);
    absent.push(section);
  }
  return absent;
}
