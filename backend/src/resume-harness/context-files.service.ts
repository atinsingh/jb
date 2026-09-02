import { Injectable } from '@nestjs/common';
import { HarnessContextFile, HarnessId } from './harness/harness.types';

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
}

/**
 * Writes the context file(s) the active harness actually reads.
 *
 * Codex and OpenCode both read `AGENTS.md` natively, so that file is the single
 * home for the shared rules: the LaTeX build contract, the file layout, and the
 * create-vs-update behaviour expected across turns.
 *
 * Claude Code does not read `AGENTS.md`. Rather than copy the rules into a
 * second file — which would drift the moment either is edited — it gets a
 * `CLAUDE.md` that pulls them in with Anthropic's documented `@AGENTS.md`
 * import and carries nothing but Claude-specific overrides.
 * `context-files.service.spec.ts` fails if any substantive line is duplicated
 * across the two.
 */
@Injectable()
export class ContextFilesService {
  filesFor(harness: HarnessId, input: SharedRulesInput): HarnessContextFile[] {
    const agents: HarnessContextFile = {
      path: 'AGENTS.md',
      contents: this.sharedRules(input),
    };

    const files: HarnessContextFile[] = [agents];

    if (input.candidateMarkdown) {
      files.push({ path: 'CANDIDATE.md', contents: input.candidateMarkdown });
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
  document class, the preamble and every section the instruction did not ask
  you to touch. Never regenerate the file from scratch to satisfy a small
  change, and never renumber or reorder sections you were not asked about.

## Content rules

- \`CANDIDATE.md\` holds the candidate's real profile, work history and
  eligibility, pulled from their account. It is the source of biographical
  fact. Read it before writing anything, and prefer it over your own guesses.
- Use only facts present in CANDIDATE.md, in the instruction, or already in the
  document. Do not invent employers, dates, degrees, certifications or metrics.
  If a section would need a fact you do not have, leave the section out.
- Keep it ATS-readable: real section headings, no text inside images, no
  multi-column layouts that break linear reading order.
- Escape LaTeX special characters in candidate-supplied text.
`;
  }

  /**
   * Claude-only overrides. Everything shared lives in AGENTS.md and is imported
   * on the first line, so this file stays short by design.
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
