type FactResume = {
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
  projects?: Array<{
    name?: string;
    description?: string;
    technologies?: string[];
    url?: string;
    startDate?: string;
    endDate?: string;
  }>;
  achievements?: string[];
  certifications?: Array<{
    name?: string;
    issuer?: string;
    date?: string;
    expiryDate?: string;
    credentialId?: string;
  }>;
  languages?: Array<{ language?: string; proficiency?: string } | string>;
  customSections?: Array<{ heading?: string; title?: string; items?: string[] }> | Record<string, unknown>;
};

type Fix = { quote?: string; message?: string; fix?: string };

function normalizeCustomSections(raw: FactResume['customSections']): Array<{ heading: string; items: string[] }> {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((section) => {
        const heading = String(section?.heading || section?.title || '').trim();
        const items = Array.isArray(section?.items)
          ? section.items.map((item) => String(item || '').trim()).filter(Boolean)
          : [];
        return heading && items.length ? { heading, items } : null;
      })
      .filter((section): section is { heading: string; items: string[] } => section != null);
  }
  if (typeof raw === 'object') {
    return Object.entries(raw)
      .map(([heading, value]) => {
        const items = Array.isArray(value)
          ? value.map((item) => String(item || '').trim()).filter(Boolean)
          : typeof value === 'string' && value.trim()
            ? [value.trim()]
            : [];
        return heading.trim() && items.length ? { heading: heading.trim(), items } : null;
      })
      .filter((section): section is { heading: string; items: string[] } => section != null);
  }
  return [];
}

export function importedResumeFacts(resume: FactResume): string {
  const lines = [
    '# Candidate facts',
    '',
    'These facts are from the résumé used for this comparison.',
    'They are the only biographical source for this résumé.',
    'Do not use the signed-in account, and do not invent employers, dates, titles, degrees, or metrics that are not written here.',
    '',
  ];
  const contact = [
    ['Name', resume.fullName],
    ['Headline', resume.headline],
    ['Email', resume.email],
    ['Phone', resume.phone],
    ['Location', resume.location],
    ['LinkedIn', resume.linkedin],
    ['GitHub', resume.github],
    ['Website', resume.website],
  ].filter(([, value]) => String(value || '').trim());
  if (contact.length) lines.push(...contact.map(([label, value]) => `- ${label}: ${String(value).trim()}`), '');
  if (resume.summary?.trim()) lines.push(`Summary: ${resume.summary.trim()}`, '');
  const experience = (resume.experience || []).filter((item) => item.title || item.company || item.description || item.achievements?.length);
  if (experience.length) {
    lines.push('## Experience', '');
    for (const item of experience) {
      const end = item.endDate || (item.current ? 'Present' : '');
      const when = [item.startDate, end].filter(Boolean).join(' – ');
      const where = [when, item.location].filter(Boolean).join(' · ');
      lines.push(`### ${[item.title, item.company].filter(Boolean).join(' — ')}${where ? ` (${where})` : ''}`);
      if (item.description?.trim()) lines.push(item.description.trim());
      for (const achievement of item.achievements || []) if (achievement.trim()) lines.push(`- ${achievement.trim()}`);
      lines.push('');
    }
  }
  if (resume.skills?.length) lines.push('## Skills', '', ...resume.skills.filter(Boolean).map((skill) => `- ${skill}`), '');
  const education = (resume.education || []).filter((item) => item.degree || item.institution);
  if (education.length) {
    lines.push('## Education', '');
    for (const item of education) {
      const details = [
        item.degree,
        item.institution,
        item.location,
        item.startDate,
        item.endDate,
        item.gpa ? `GPA ${item.gpa}` : '',
        item.description,
      ].filter(Boolean);
      lines.push(`- ${details.join(', ')}`);
    }
    lines.push('');
  }
  const certifications = (resume.certifications || []).filter((item) => item.name);
  if (certifications.length) {
    lines.push('## Certifications', '');
    for (const item of certifications) {
      lines.push(`- ${[item.name, item.issuer, item.date, item.expiryDate, item.credentialId].filter(Boolean).join(', ')}`);
    }
    lines.push('');
  }
  if (resume.achievements?.length) lines.push('## Achievements', '', ...resume.achievements.filter(Boolean).map((item) => `- ${item}`), '');
  const projects = (resume.projects || []).filter((item) => item.name || item.description);
  if (projects.length) {
    lines.push('## Projects', '');
    for (const item of projects) {
      const head = [item.name, item.description].filter(Boolean).join(': ');
      const meta = [
        item.technologies?.length ? `Technologies: ${item.technologies.join(', ')}` : '',
        [item.startDate, item.endDate].filter(Boolean).join(' – '),
        item.url,
      ].filter(Boolean).join(' · ');
      lines.push(`- ${meta ? `${head} (${meta})` : head}`);
    }
    lines.push('');
  }
  const languages = (resume.languages || [])
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      const name = String(entry?.language || '').trim();
      const level = String(entry?.proficiency || '').trim();
      return name ? (level ? `${name} (${level})` : name) : '';
    })
    .filter(Boolean);
  if (languages.length) {
    lines.push('## Languages', '', ...languages.map((lang) => `- ${lang}`), '');
  }
  for (const section of normalizeCustomSections(resume.customSections)) {
    lines.push(`## ${section.heading}`, '', ...section.items.map((item) => `- ${item}`), '');
  }
  return lines.join('\n').trim();
}

export function correctionInstruction(annotations: Fix[]): string {
  const lines = [
    'Write the résumé in the selected template using only the facts in the candidate file.',
    'Apply a review fix only when those facts support it. Do not invent metrics, employers, titles, or skills to satisfy a fix.',
    'If a fix asks for evidence that is not in the facts, leave that claim out.',
  ];
  const fixes = (annotations || []).filter((item) => item.fix?.trim()).slice(0, 12);
  if (!fixes.length) return lines.join('\n');
  lines.push('', 'Review fixes:');
  for (const item of fixes) {
    const quote = item.quote?.trim() ? ` “${item.quote.trim().slice(0, 180)}”` : '';
    lines.push(`- ${(item.message || 'Improve this part').trim()}.${quote} Fix: ${item.fix.trim().slice(0, 400)}`);
  }
  return lines.join('\n');
}
