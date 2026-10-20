type FactResume = {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  summary?: string;
  skills?: string[];
  experience?: Array<{ title?: string; company?: string; startDate?: string; endDate?: string; description?: string; achievements?: string[] }>;
  education?: Array<{ degree?: string; institution?: string; startDate?: string; endDate?: string }>;
  projects?: Array<{ name?: string; description?: string }>;
  achievements?: string[];
  certifications?: Array<{ name?: string; issuer?: string; date?: string }>;
};

type Fix = { quote?: string; message?: string; fix?: string };

export function importedResumeFacts(resume: FactResume): string {
  const lines = [
    '## Uploaded résumé',
    '',
    'These facts are from the résumé the candidate uploaded. They are candidate facts.',
    'Do not invent employers, dates, titles, degrees, or metrics beyond this section and the profile above.',
    '',
  ];
  const contact = [
    ['Name', resume.fullName],
    ['Email', resume.email],
    ['Phone', resume.phone],
    ['Location', resume.location],
    ['LinkedIn', resume.linkedin],
  ].filter(([, value]) => String(value || '').trim());
  if (contact.length) lines.push(...contact.map(([label, value]) => `- ${label}: ${String(value).trim()}`), '');
  if (resume.summary?.trim()) lines.push(`Summary: ${resume.summary.trim()}`, '');
  const experience = (resume.experience || []).filter((item) => item.title || item.company || item.description || item.achievements?.length);
  if (experience.length) {
    lines.push('## Experience', '');
    for (const item of experience) {
      const when = [item.startDate, item.endDate].filter(Boolean).join(' – ');
      lines.push(`### ${[item.title, item.company].filter(Boolean).join(' — ')}${when ? ` (${when})` : ''}`);
      if (item.description?.trim()) lines.push(item.description.trim());
      for (const achievement of item.achievements || []) if (achievement.trim()) lines.push(`- ${achievement.trim()}`);
      lines.push('');
    }
  }
  if (resume.skills?.length) lines.push('## Skills', '', ...resume.skills.filter(Boolean).map((skill) => `- ${skill}`), '');
  const education = (resume.education || []).filter((item) => item.degree || item.institution);
  if (education.length) {
    lines.push('## Education', '');
    for (const item of education) lines.push(`- ${[item.degree, item.institution, item.startDate, item.endDate].filter(Boolean).join(', ')}`);
    lines.push('');
  }
  const certifications = (resume.certifications || []).filter((item) => item.name);
  if (certifications.length) {
    lines.push('## Certifications', '');
    for (const item of certifications) lines.push(`- ${[item.name, item.issuer, item.date].filter(Boolean).join(', ')}`);
    lines.push('');
  }
  if (resume.achievements?.length) lines.push('## Achievements', '', ...resume.achievements.filter(Boolean).map((item) => `- ${item}`), '');
  const projects = (resume.projects || []).filter((item) => item.name || item.description);
  if (projects.length) {
    lines.push('## Projects', '');
    for (const item of projects) lines.push(`- ${[item.name, item.description].filter(Boolean).join(': ')}`);
    lines.push('');
  }
  return lines.join('\n').trim();
}

export function correctionInstruction(annotations: Fix[]): string {
  const lines = [
    'Write the résumé in the selected template using only the profile and the uploaded résumé facts.',
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
