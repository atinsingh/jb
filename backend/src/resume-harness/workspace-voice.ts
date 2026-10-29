/** Sandbox filenames a candidate or employer must never see. */
const WORKSPACE_FILES: Array<[RegExp, string]> = [
  [/ORIGINAL_RESUME\.pdf/g, 'the original résumé'],
  [/ORIGINAL_RESUME\.docx/g, 'the original résumé'],
  [/ATS_RESULT\.json/g, 'the ATS result'],
  [/MISSING_SECTIONS\.json/g, 'the missing sections'],
  [/CANDIDATE\.md/g, 'the candidate profile'],
  [/TEMPLATE\.tex/g, 'the template'],
  [/AGENTS\.md/g, 'the instructions'],
  [/CLAUDE\.md/g, 'the instructions'],
  [/RESUME\.txt/g, 'the résumé'],
  [/JOB\.txt/g, 'the job description'],
];

/** Shared line for compare, generate, and employer review prompts. */
export const WORKSPACE_VOICE_RULE =
  'Never name workspace files in text a person will read. JOB.txt, RESUME.txt, ATS_RESULT.json, MISSING_SECTIONS.json, ORIGINAL_RESUME.pdf, ORIGINAL_RESUME.docx, CANDIDATE.md, AGENTS.md, and CLAUDE.md exist only in this session, as does any template file. Call them the job description, the résumé, the ATS result, the missing sections, the original résumé, the candidate profile, or the template.';

export function hideWorkspaceFiles(text: string): string {
  let next = String(text || '');
  for (const [pattern, label] of WORKSPACE_FILES) next = next.replace(pattern, label);
  return next.replace(/[ \t]{2,}/g, ' ').trim();
}
