import { cleanRole, shortTitle, titleFromJobText, titleFromJobUrl } from './target-roles';

export type HarnessSessionLike = {
  candidateName?: string;
  candidateMarkdown?: string;
  targetRole?: string;
  name?: string;
  jobDescription?: string;
  jobUrl?: string;
  compiled?: boolean;
  turns?: Array<{ compiled?: boolean }>;
  archivedAt?: Date | string | null;
};

export type GeneratedResume = {
  fullName?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  headline?: string;
  skills: string[];
  roles: string[];
};

const MAX_SKILLS = 30;
const IDENTITY_LINE = /^-\s*(name|email|phone|linkedin|headline):\s*(.*)$/i;

/** Identity bullets sit before the first `## ` heading that is not `## Identity`. */
function identityLines(markdown: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^##\s/.test(line) && !/^##\s+identity\s*$/i.test(line)) break;
    const match = IDENTITY_LINE.exec(line);
    if (match && !found.has(match[1].toLowerCase())) found.set(match[1].toLowerCase(), match[2].trim());
  }
  return found;
}

function skillsSection(markdown: string): string[] {
  const skills: string[] = [];
  const seen = new Set<string>();
  let inSection = false;
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^##\s/.test(line)) {
      if (inSection) break;
      inSection = /^##\s+skills\s*$/i.test(line);
      continue;
    }
    if (!inSection || !line) continue;
    const parts = line.startsWith('- ') ? [line.slice(2)] : line.split(',');
    for (const part of parts) {
      const skill = part.trim();
      const key = skill.toLowerCase();
      if (!skill || seen.has(key)) continue;
      seen.add(key);
      skills.push(skill);
    }
  }
  return skills.slice(0, MAX_SKILLS);
}

/** The identity, skills and roles of a compiled résumé session, or null when it is not one. */
export function generatedResumeFromSession(session: HarnessSessionLike): GeneratedResume | null {
  if (session.archivedAt) return null;
  const compiled = session.compiled === true || (session.turns || []).some((turn) => turn.compiled === true);
  if (!compiled) return null;

  const markdown = session.candidateMarkdown || '';
  const identity = identityLines(markdown);
  const roles: string[] = [];
  const seen = new Set<string>();
  for (const role of [
    cleanRole(session.targetRole),
    titleFromJobText(session.jobDescription),
    titleFromJobUrl(session.jobUrl),
  ]) {
    if (!role || seen.has(role.toLowerCase())) continue;
    seen.add(role.toLowerCase());
    roles.push(role);
  }

  return {
    fullName: identity.get('name') || session.candidateName || undefined,
    email: identity.get('email') || undefined,
    phone: identity.get('phone') || undefined,
    linkedin: identity.get('linkedin') || undefined,
    headline: shortTitle(identity.get('headline')),
    skills: skillsSection(markdown),
    roles,
  };
}
