const GENERATED = new Set(['ai_rewrite', 'job_tailored', 'generated']);

export type SearchableResume = {
  status?: string;
  creationMethod?: string;
  source?: unknown;
  targetRole?: string;
  headline?: string;
  name?: string;
};

export type RoleSession = {
  targetRole?: string;
  name?: string;
  jobUrl?: string;
};

const clean = (value?: string) => (value || '').trim().replace(/\s+/g, ' ');

/** A headline or job line counts as a role only when it is a short title. */
export function shortTitle(value?: string): string | undefined {
  const title = clean(value);
  if (!title || title.length > 80 || title.includes('.')) return undefined;
  return title;
}

export function isSearchableResume(resume: SearchableResume, hasCompletedReview: boolean): boolean {
  if (resume.status === 'archived') return false;
  if (resume.creationMethod && GENERATED.has(resume.creationMethod)) return true;
  if (resume.source === 'generated') return true;
  return resume.creationMethod === 'imported' && hasCompletedReview;
}

const ROLE_NOUN = /\b(?:engineer|developer|programmer|manager|designer|analyst|scientist|specialist|consultant|architect|lead|director|administrator|coordinator|intern|trainer|accountant|nurse|teacher|technician|officer|representative|associate|assistant|tester|writer|editor|recruiter|advisor|strategist|executive|operator|sre|devops|chef|cook|cashier|barista|pharmacist|electrician|plumber|driver|clerk|therapist|physician|lawyer|paralegal|researcher|instructor|owner)\b/i;
const NOT_A_ROLE_START = /^(?:we|we're|you|your|our|join|the|this|about|are|is|looking|select|apply|create|full job description)\b/i;
const JOB_TEXT_CUT = / at | @ | - | – | — | \| |,|\(/;

/** A job line's title: its first sentence, cut before the employer or location. */
function titleFromJobLine(line: string): string | undefined {
  const sentence = line.split(/[.!?](?=\s|$)/)[0];
  const candidate = sentence.split(JOB_TEXT_CUT)[0].trim();
  const title = shortTitle(candidate);
  if (!title) return undefined;
  if (title.split(' ').length > 8 || !ROLE_NOUN.test(title)) return undefined;
  if (title.includes('{') || title.endsWith(':') || NOT_A_ROLE_START.test(title)) return undefined;
  return title;
}

export function titleFromJobText(jobText?: string): string | undefined {
  if (!jobText) return undefined;
  const lines = jobText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const labelled = /^(?:job title|title|role|position)\s*[:\-]\s*(.+)$/i.exec(line);
    if (!labelled) continue;
    const title = shortTitle(labelled[1]);
    if (title) return title;
  }
  for (const line of lines.slice(0, 3)) {
    const title = titleFromJobLine(line);
    if (title) return title;
  }
  return undefined;
}

/** A stored role label cleaned for display, or undefined when it names no role. */
export function cleanRole(value?: string): string | undefined {
  let role = (value || '').trim();
  if (!role) return undefined;
  if (role.includes('_')) {
    role = role
      .split('_')
      .map((segment) => segment.trim())
      .filter((segment) => ROLE_NOUN.test(segment))
      .join(' ');
  } else if (/\b(?:resume|résumé|cv)\b/i.test(role) || /\.(?:pdf|docx?)$/i.test(role)) {
    return undefined;
  }
  role = clean(role.replace(/\(\d+\)/g, ' '));
  const letters = role.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letters && letters === letters.toUpperCase()) {
    role = role
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  return shortTitle(role);
}

export function titleFromJobUrl(jobUrl?: string): string | undefined {
  const raw = jobUrl?.trim();
  if (!raw) return undefined;
  let pathname = raw.split('?')[0];
  try {
    pathname = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).pathname;
  } catch {
    pathname = raw.split('?')[0];
  }
  const segment = pathname.split('/').filter(Boolean).pop() || '';
  if (!segment || /^\d+$/.test(segment)) return undefined;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return undefined;
  if (/^[0-9a-f]{16,}$/i.test(segment)) return undefined;
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    decoded = segment;
  }
  return shortTitle(decoded.replace(/[-_]+/g, ' '));
}

function roleKey(value: string): string {
  return clean(value).toLowerCase();
}

/** Roles from one included résumé. An unmatched harness session adds nothing. */
export function rolesForResume(
  resume: SearchableResume,
  input: { jobText?: string; sessions?: RoleSession[] } = {},
): string[] {
  const roles: string[] = [];
  const add = (value?: string) => {
    const title = clean(value);
    if (title) roles.push(title);
  };
  add(cleanRole(resume.targetRole));
  add(shortTitle(resume.headline));
  add(titleFromJobText(input.jobText));
  if (resume.source && typeof resume.source === 'object') {
    const source = resume.source as { jobUrl?: string; jobDescription?: string };
    add(titleFromJobText(source.jobDescription));
    add(titleFromJobUrl(source.jobUrl));
  }

  const anchors = new Set(
    [resume.targetRole, resume.name].map((value) => roleKey(value || '')).filter(Boolean),
  );
  for (const session of input.sessions || []) {
    const sessionAnchors = [session.targetRole, session.name]
      .map((value) => roleKey(value || ''))
      .filter(Boolean);
    if (!sessionAnchors.some((anchor) => anchors.has(anchor))) continue;
    add(cleanRole(session.targetRole));
    add(titleFromJobUrl(session.jobUrl));
  }

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const role of roles) {
    const key = roleKey(role);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(clean(role));
  }
  return unique;
}
