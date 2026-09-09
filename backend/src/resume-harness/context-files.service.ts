import { Injectable } from '@nestjs/common';
import { HarnessContextFile, HarnessId } from './harness/harness.types';

/** One resolved knob choice, with the sentence the harness is given for it. */
export interface LookDirective {
  key: string;
  label: string;
  choice: string;
  choiceLabel: string;
  directive: string;
}

/**
 * The template a session is running under, resolved to text.
 *
 * Everything here is data read out of the template document — the skeleton, the
 * constraints and the per-knob directives. Nothing in this file decides what a
 * look option means; it decides only where the harness reads it.
 */
export interface TemplateCondition {
  key: string;
  name: string;
  description?: string;
  /** LaTeX preamble and scaffolding, written into the sandbox as TEMPLATE.tex. */
  skeleton: string;
  constraints: string[];
  look: LookDirective[];
}

/** Path the template skeleton is written to, and named in the shared rules. */
export const TEMPLATE_PATH = 'TEMPLATE.tex';

export interface SharedRulesInput {
  /** Absolute workspace path inside the sandbox. */
  workdir: string;
  /** LaTeX source the harness owns, relative to the workdir. */
  texPath: string;
  /** Compiled output, relative to the workdir. */
  pdfPath: string;
  /** Exact command the sandbox runs to compile. */
  buildCommand: string;
  /**
   * The candidate's own facts, from `CandidateContextService`. Written as its
   * own file because it is per-session data rather than a shared rule, and
   * referenced from AGENTS.md so the harness has a reason to read it.
   * Empty means the profile had nothing to give.
   */
  candidateMarkdown?: string;
  /**
   * The selected template and the look currently in force. Absent means no
   * template has been chosen, and the template section is omitted entirely
   * rather than written as an empty heading.
   */
  template?: TemplateCondition;
}

/**
 * Writes the context file(s) the active harness actually reads.
 *
 * Codex and OpenCode both read `AGENTS.md` natively, so that file is the single
 * home for the shared rules: the LaTeX build contract, the file layout, the
 * create-vs-update behaviour expected across turns, and the template condition
 * the résumé must be written under.
 *
 * Claude Code does not read `AGENTS.md`. Rather than copy the rules into a
 * second file — which would drift the moment either is edited — it gets a
 * `CLAUDE.md` that pulls them in with Anthropic's documented `@AGENTS.md`
 * import and carries nothing but Claude-specific overrides.
 * `context-files.service.spec.ts` fails if any substantive line is duplicated
 * across the two.
 *
 * Because the template condition goes into the shared file, a template
 * selection or a vibe change is one write for every harness, and there is no
 * per-harness copy of the look that could go stale on its own.
 */
@Injectable()
export class ContextFilesService {
  filesFor(harness: HarnessId, input: SharedRulesInput): HarnessContextFile[] {
    const files: HarnessContextFile[] = [
      { path: 'AGENTS.md', contents: this.sharedRules(input) },
    ];

    if (input.candidateMarkdown) {
      files.push({ path: 'CANDIDATE.md', contents: input.candidateMarkdown });
    }
    if (input.template) {
      // A real file rather than a quoted block in the rules: the harness has to
      // preserve this preamble verbatim, and reconstructing it from a prose
      // description is exactly how a preamble gets lost.
      files.push({
        path: TEMPLATE_PATH,
        contents: input.template.skeleton,
      });
    }
    if (harness === 'claude-code') {
      files.push({ path: 'CLAUDE.md', contents: this.claudeOverrides() });
    }
    return files;
  }

  /** The rules every harness follows, byte-identical for all three. */
  sharedRules(input: SharedRulesInput): string {
    const { texPath, pdfPath, buildCommand, workdir } = input;
    return `# Resume agent rules

You maintain one LaTeX resume in this workspace. You are not a chat assistant:
finish the edit, leave the workspace compiling, and stop.

## Files

- \`${texPath}\` - the resume source. You own it. It is the only file the
  product reads back, so anything not in it does not exist.
- \`${pdfPath}\` - the compiled output. Never hand-edit it.
- Workspace root is \`${workdir}\`. Do not write outside it.

## Build contract

Compile with exactly this command, from the workspace root:

\`\`\`sh
${buildCommand}
\`\`\`

A turn is only finished when that command exits 0. If it fails, read the log,
fix the source, and run it again. Do not report success on a failed build, and
do not work around a broken package by deleting the section that uses it.

## Creating versus updating

- If ${texPath} does not exist, create it as a complete, self-contained
  document using only packages available in the image.
- If it does exist, edit the existing ${texPath} in place. Preserve the
  document class, the preamble and every supported section the instruction did
  not ask you to touch. Never regenerate the file from scratch to satisfy a
  small change, and never renumber or reorder supported sections you were not
  asked about.

## Content rules

- \`CANDIDATE.md\` holds the candidate's real profile, work history and
  eligibility, pulled from their account. It is the source of biographical
  fact. Read it before writing anything, and prefer it over your own guesses.
- Use only facts present in CANDIDATE.md or explicitly stated as candidate facts
  in the current instruction. The existing resume is a working artifact, not a
  source of factual truth: a claim does not become valid because an earlier
  model wrote it. Do not invent employers, roles, dates, degrees, skills,
  certifications, metrics or professional characterizations.
- A section named Experience, Education, Skills, Certifications or Achievements
  is allowed only when CANDIDATE.md contains that section. A professional
  Summary is allowed only when the profile contains career evidence to
  summarize. Otherwise leave the section out.
- Before finishing, audit every factual claim in ${texPath}. For each claim you
  must be able to identify its exact source line in CANDIDATE.md or the current
  instruction. Delete any claim you cannot trace. Do this silently; do not put
  the audit in the resume.
- Keep it ATS-readable: real section headings, no text inside images, no
  multi-column layouts that break linear reading order.
- Escape LaTeX special characters in candidate-supplied text.
- ${texPath} contains LaTeX and nothing else. Never write your own tooling's
  framing into it: no path, type or content wrappers around the document, and
  no line-number prefixes from a file you read. When you read a file, use what
  it says - do not paste back how your tools displayed it to you.
- The finished file contains exactly one \\begin{document} and exactly one
  \\end{document}, with no document content after the closing command. Never
  leave an empty section heading.
${this.templateSection(input.template, texPath)}`;
  }

  /**
   * The template and look currently in force.
   *
   * Rewritten on every template selection and every vibe change, which is what
   * makes the condition the harness reads and the condition the candidate
   * selected the same thing. The re-apply rule is stated in the strongest terms
   * available because re-seating content on a new skeleton is the single
   * operation most likely to lose an employer, a date or a whole section.
   */
  private templateSection(
    template: TemplateCondition | undefined,
    texPath: string,
  ): string {
    if (!template) return '';

    const constraints = template.constraints.length
      ? template.constraints.map((c) => `- ${c}`).join('\n')
      : '- None beyond the shared rules above.';

    const look = template.look.length
      ? template.look
          .map((l) => `- **${l.label} — ${l.choiceLabel}.** ${l.directive}`)
          .join('\n')
      : '- Default look; no options are set.';

    return `
## Template and look

This resume follows the **${template.name}** template.${
      template.description ? ` ${template.description}` : ''
    }

- \`${TEMPLATE_PATH}\` holds this template's skeleton: its document class,
  preamble, spacing and section commands. Read it first. When you create
  ${texPath}, start from that skeleton and keep its preamble and its section
  macros intact rather than writing a preamble of your own.
- Use the skeleton's own commands for structure. If it defines a macro for a
  section heading or an entry, use it; do not hand-roll an equivalent.

### Template constraints

${constraints}

### Current look

${look}

### When the template or the look changes

You will be asked to re-apply the resume to a changed condition. When that
happens:

- Re-apply the existing content onto the new skeleton. The facts do not change:
  keep every employer, title, date, bullet, number and section that is already
  in ${texPath}, word for word wherever the new look does not require rewording.
- Never drop a section, an entry or a bullet to make the document fit a new
  layout. If it no longer fits, change the spacing, not the content.
- Do not invent anything to fill a shape the new template suggests. An empty
  section is left out, exactly as in the content rules above.
- The look controls presentation only: spacing, fonts, colour, ordering and
  wording of your own connective text. It never controls what is claimed.
`;
  }

  /**
   * Claude-only overrides. Everything shared lives in AGENTS.md and is imported
   * on the first line, so this file stays short by design — the template
   * condition included, which is why a look change is one write and not two
   * copies that can disagree.
   */
  private claudeOverrides(): string {
    return `# Claude Code overrides

@AGENTS.md

The rules above are shared with the other harnesses. Only Claude Code specifics
belong below.

- Run in this workspace only; there is no repository, so skip git operations.
- Prefer the Edit tool over rewriting a file with Write - a full rewrite loses
  preamble details the shared rules require you to preserve.
- Do not ask for permission or propose a plan; the sandbox is the boundary and
  no human is watching this turn.
- Reply with a one-line summary of what changed. No preamble, no file dumps.
`;
  }
}
