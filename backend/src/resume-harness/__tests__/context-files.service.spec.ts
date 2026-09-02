import { ContextFilesService } from '../context-files.service';
import { HARNESS_IDS } from '../harness/harness.types';

describe('ContextFilesService', () => {
  const service = new ContextFilesService();

  const input = {
    workdir: '/workspace',
    texPath: 'resume.tex',
    pdfPath: 'build/resume.pdf',
    buildCommand: 'latexmk -pdf -interaction=nonstopmode -outdir=build resume.tex',
  };

  const fileNames = (id: (typeof HARNESS_IDS)[number]) =>
    service.filesFor(id, input).map((f) => f.path);

  const fileNamed = (id: (typeof HARNESS_IDS)[number], path: string) =>
    service.filesFor(id, input).find((f) => f.path === path);

  it('gives Codex and OpenCode the AGENTS.md they read natively, and nothing else', () => {
    for (const id of ['codex', 'opencode'] as const) {
      expect(fileNames(id)).toEqual(['AGENTS.md']);
    }
  });

  it('puts the shared LaTeX contract in AGENTS.md', () => {
    const agents = fileNamed('codex', 'AGENTS.md')!.contents;
    expect(agents).toContain(input.buildCommand);
    expect(agents).toContain('resume.tex');
    expect(agents).toContain('build/resume.pdf');
    // The create-vs-update contract the harness must honour across turns.
    expect(agents).toMatch(/edit .*resume\.tex in place/i);
  });

  it('gives Claude Code a CLAUDE.md that imports AGENTS.md instead of copying it', () => {
    expect(fileNames('claude-code').sort()).toEqual(['AGENTS.md', 'CLAUDE.md']);

    const claude = fileNamed('claude-code', 'CLAUDE.md')!.contents;
    // Anthropic's documented import syntax — the shared rules stay in one file.
    expect(claude).toMatch(/^@AGENTS\.md$/m);
    // Claude-only overrides live here and only here.
    expect(claude).toMatch(/claude code/i);
  });

  it('does not duplicate any shared rule into CLAUDE.md', () => {
    const files = service.filesFor('claude-code', input);
    const agents = files.find((f) => f.path === 'AGENTS.md')!.contents;
    const claude = files.find((f) => f.path === 'CLAUDE.md')!.contents;

    expect(claude).not.toContain(input.buildCommand);

    // No substantive line of AGENTS.md may be repeated in CLAUDE.md.
    const meaningful = (s: string) =>
      s
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 24 && !l.startsWith('#'));
    const claudeLines = new Set(meaningful(claude));
    const duplicated = meaningful(agents).filter((l) => claudeLines.has(l));
    expect(duplicated).toEqual([]);
  });

  it('serves byte-identical shared rules to every harness', () => {
    const bodies = HARNESS_IDS.map(
      (id) => service.filesFor(id, input).find((f) => f.path === 'AGENTS.md')!.contents,
    );
    expect(new Set(bodies).size).toBe(1);
  });
});

/**
 * Candidate facts reach the harness as their own file.
 *
 * They are per-session data, not shared rules, so they do not belong in
 * AGENTS.md — but AGENTS.md has to point at them, or the harness has no reason
 * to read the file and will write from the instruction alone.
 */
describe('ContextFilesService — candidate facts', () => {
  const service = new ContextFilesService();
  const input = {
    workdir: '/workspace',
    texPath: 'resume.tex',
    pdfPath: 'build/resume.pdf',
    buildCommand: 'latexmk -pdf -outdir=build resume.tex',
    candidateMarkdown: '# Candidate facts\n\n- Name: Jordan Reyes\n',
  };

  it('writes the facts as CANDIDATE.md for every harness', () => {
    for (const id of HARNESS_IDS) {
      const files = service.filesFor(id, input);
      const candidate = files.find((f) => f.path === 'CANDIDATE.md');
      expect(candidate).toBeDefined();
      expect(candidate!.contents).toContain('Jordan Reyes');
    }
  });

  it('points AGENTS.md at the facts and forbids inventing others', () => {
    const agents = service
      .filesFor('codex', input)
      .find((f) => f.path === 'AGENTS.md')!.contents;
    expect(agents).toContain('CANDIDATE.md');
    expect(agents).toMatch(/do not invent|never invent/i);
  });

  it('omits the file entirely when there are no facts to give', () => {
    const files = service.filesFor('codex', { ...input, candidateMarkdown: '' });
    expect(files.find((f) => f.path === 'CANDIDATE.md')).toBeUndefined();
  });
});
