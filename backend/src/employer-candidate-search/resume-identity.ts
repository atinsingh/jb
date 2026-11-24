export type AccountIdentity = {
  name?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
};

export type ResumeIdentity = {
  fullName?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  website?: string;
};

const foldName = (value?: string) => (value || '').trim().replace(/\s+/g, ' ').toLowerCase();
const foldEmail = (value?: string) => (value || '').trim().toLowerCase();
const foldPhone = (value?: string) => (value || '').replace(/\D/g, '');
const nameTokens = (value?: string) => foldName(value).split(' ').filter(Boolean);

/**
 * Same person when the names are equal, or a middle name is missing.
 * A single first name does not confirm a longer name, nor contradict it.
 */
function namesAgree(account?: string, resume?: string): 'skip' | 'match' | 'conflict' {
  const left = nameTokens(account);
  const right = nameTokens(resume);
  if (!left.length || !right.length) return 'skip';
  if (left.length === right.length && left.every((token, i) => token === right[i])) return 'match';
  if (left.length === 1 && left[0] === right[0]) return 'skip';
  if (right.length === 1 && right[0] === left[0]) return 'skip';
  const [small, large] = left.length <= right.length ? [left, right] : [right, left];
  const largeSet = new Set(large);
  const subset = small.every((token) => largeSet.has(token));
  if (subset && (small.length === large.length || small.length >= 2)) return 'match';
  return 'conflict';
}

/** LinkedIn profile slug. A bare label that is not a LinkedIn URL stays as itself. */
export function linkedInSlug(value?: string): string {
  const raw = (value || '').trim();
  if (!raw) return '';
  const absolute = /^https?:\/\//i.test(raw)
    ? raw
    : /linkedin\.com/i.test(raw)
      ? `https://${raw.replace(/^\/\//, '')}`
      : '';
  let path = raw;
  if (absolute) {
    try {
      path = new URL(absolute).pathname;
    } catch {
      path = raw;
    }
  }
  const parts = path.split('/').filter(Boolean);
  const inIndex = parts.findIndex((part) => part.toLowerCase() === 'in');
  const slug = (inIndex >= 0 ? parts[inIndex + 1] : parts[parts.length - 1]) || '';
  return slug.split('?')[0].toLowerCase();
}

/**
 * A résumé is the account holder only with no contradicting name or social
 * and at least one positive match. Owning the row is not a match. GitHub and
 * website never count, in either direction.
 */
export function resumeMatchesAccount(account: AccountIdentity, resume: ResumeIdentity): boolean {
  const name = namesAgree(account.name, resume.fullName);
  if (name === 'conflict') return false;
  const pairs: Array<[string, string]> = [
    [foldEmail(account.email), foldEmail(resume.email)],
    [foldPhone(account.phone), foldPhone(resume.phone)],
    [linkedInSlug(account.linkedin), linkedInSlug(resume.linkedin)],
  ];
  // A phone that differs while name, email and LinkedIn agree is treated as a number the account changed.
  const corroborated = name === 'match' && pairs[0][0] !== '' && pairs[0][0] === pairs[0][1]
    && pairs[2][0] !== '' && pairs[2][0] === pairs[2][1];
  let positive = name === 'match';
  for (let i = 0; i < pairs.length; i++) {
    const [left, right] = pairs[i];
    if (!left || !right) continue;
    if (left !== right) {
      if (i === 1 && corroborated) continue;
      return false;
    }
    positive = true;
  }
  return positive;
}
