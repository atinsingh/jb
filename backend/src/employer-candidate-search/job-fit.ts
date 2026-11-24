const SENIORITY = /^(senior|junior|lead|staff|principal|sr\.?|jr\.?|head)$/i;

const fold = (value?: string) => (value || '').trim().replace(/\s+/g, ' ').toLowerCase();

/** Job title with seniority words removed, so "Senior Backend Engineer" still finds "Backend Engineer". */
export function jobRoleQuery(title?: string): string {
  return (title || '')
    .trim()
    .split(/\s+/)
    .filter((word) => word && !SENIORITY.test(word.replace(/[.,]$/, '')))
    .join(' ');
}

export function roleFits(jobTitle: string | undefined, targetRole: string): boolean {
  const query = fold(jobRoleQuery(jobTitle));
  const role = fold(targetRole);
  if (!query || !role) return false;
  if (role.includes(query)) return true;
  const roleWords = role.split(' ').filter(Boolean);
  return roleWords.length >= 2 && query.includes(role);
}

export function skillFits(jobSkills: string[] | undefined, candidateSkills: string[]): boolean {
  const wanted = new Set((jobSkills || []).map((skill) => fold(skill)).filter(Boolean));
  return candidateSkills.some((skill) => wanted.has(fold(skill)));
}
