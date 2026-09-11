import { ContextFilesService } from '../context-files.service';
import { HARNESS_IDS } from '../harness/harness.types';

describe('ContextFilesService', () => {
  const service = new ContextFilesService();

  const input = {
    workdir: '/workspace',
    texPath: 'resume.tex',
    pdfPath: 'build/resume.pdf',
    buildCommand:
      'latexmk -pdf -interaction=nonstopmode -outdir=build resume.tex',
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

  it('requires a useful conversational response and edits only when requested', () => {
    const agents = fileNamed('codex', 'AGENTS.md')!.contents;

    expect(agents).toMatch(/answer.*question/i);
    expect(agents).toMatch(/only edit.*resume\.tex.*request/i);
    expect(agents).toMatch(/what (?:you )?changed/i);
    expect(agents).not.toMatch(/one-line summary/i);
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
      (id) =>
        service.filesFor(id, input).find((f) => f.path === 'AGENTS.md')!
          .contents,
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
    expect(agents).toMatch(
      /existing[\s\S]*not a[\s\S]*source of factual truth/i,
    );
    expect(agents).toMatch(/exact source line/i);
  });

  it('requires a labeled placeholder draft when the profile has identity but no career facts', () => {
    const agents = service
      .filesFor('opencode', input)
      .find((f) => f.path === 'AGENTS.md')!.contents;

    expect(agents).toMatch(/placeholder draft/i);
    expect(agents).toMatch(/summary[\s\S]*experience[\s\S]*skills[\s\S]*education/i);
    expect(agents).toMatch(/never[\s\S]*job description[\s\S]*candidate facts/i);
  });

  it('omits the file entirely when there are no facts to give', () => {
    const files = service.filesFor('codex', {
      ...input,
      candidateMarkdown: '',
    });
    expect(files.find((f) => f.path === 'CANDIDATE.md')).toBeUndefined();
  });
});

/**
 * The template condition reaches the harness through the shared rules.
 *
 * A template selection or a vibe change is only real if the file the harness
 * actually reads says so. `AGENTS.md` is that file for every harness, and
 * Claude Code reaches it through the `@AGENTS.md` import — so the condition is
 * written once and the no-duplication rule above still holds.
 */
describe('ContextFilesService — template condition', () => {
  const service = new ContextFilesService();

  const template = {
    key: 'modern-sans',
    name: 'Modern Sans',
    description: 'Left-aligned header with a rule.',
    skeleton: '\documentclass{article}\n% modern-sans skeleton\n',
    constraints: ['Keep the rule under the name.', 'One column only.'],
    look: [
      {
        key: 'density',
        label: 'Density',
        choice: 'compact',
        choiceLabel: 'Compact',
        directive: 'Tighten vertical spacing to fit one page.',
      },
      {
        key: 'accent',
        label: 'Accent',
        choice: 'navy',
        choiceLabel: 'Navy',
        directive: 'Use the navy accent on section headings only.',
      },
    ],
  };

  const withTemplate = {
    workdir: '/workspace',
    texPath: 'resume.tex',
    pdfPath: 'build/resume.pdf',
    buildCommand: 'latexmk -pdf -outdir=build resume.tex',
    candidateMarkdown: '# Candidate facts\n\n- Name: Jordan Reyes\n',
    template,
  };

  it('writes the skeleton as its own file rather than inlining it in the rules', () => {
    for (const id of HARNESS_IDS) {
      const files = service.filesFor(id, withTemplate);
      const skeleton = files.find((f) => f.path === 'TEMPLATE.tex');
      expect(skeleton).toBeDefined();
      expect(skeleton!.contents).toContain('% modern-sans skeleton');
    }
  });

  it('states the selected template and every knob choice in AGENTS.md', () => {
    const agents = service
      .filesFor('codex', withTemplate)
      .find((f) => f.path === 'AGENTS.md')!.contents;

    expect(agents).toContain('Modern Sans');
    expect(agents).toContain('TEMPLATE.tex');
    expect(agents).toContain('Keep the rule under the name.');
    expect(agents).toContain('Tighten vertical spacing to fit one page.');
    expect(agents).toContain('Use the navy accent on section headings only.');
  });

  it('tells the harness a look change must not change the facts', () => {
    const agents = service
      .filesFor('opencode', withTemplate)
      .find((f) => f.path === 'AGENTS.md')!.contents;
    // Re-applying content onto a new skeleton is the one operation most likely
    // to lose an employer or a date, so the rule is explicit.
    expect(agents).toMatch(/re-?apply/i);
    expect(agents).toMatch(/do not (change|invent|drop)|never (change|drop)/i);
  });

  it('keeps the condition out of CLAUDE.md, which imports it instead', () => {
    const files = service.filesFor('claude-code', withTemplate);
    const claude = files.find((f) => f.path === 'CLAUDE.md')!.contents;
    const agents = files.find((f) => f.path === 'AGENTS.md')!.contents;

    expect(claude).toMatch(/^@AGENTS\.md$/m);
    expect(claude).not.toContain('Modern Sans');
    expect(claude).not.toContain('Tighten vertical spacing to fit one page.');

    const meaningful = (s: string) =>
      s
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 24 && !l.startsWith('#'));
    const claudeLines = new Set(meaningful(claude));
    expect(meaningful(agents).filter((l) => claudeLines.has(l))).toEqual([]);
  });

  it('changes the rules when the look changes, so a stale condition is visible', () => {
    const before = service
      .filesFor('codex', withTemplate)
      .find((f) => f.path === 'AGENTS.md')!.contents;

    const after = service
      .filesFor('codex', {
        ...withTemplate,
        template: {
          ...template,
          look: [
            {
              ...template.look[0],
              choice: 'airy',
              choiceLabel: 'Airy',
              directive: 'Open the spacing up.',
            },
            template.look[1],
          ],
        },
      })
      .find((f) => f.path === 'AGENTS.md')!.contents;

    expect(after).not.toBe(before);
    expect(after).toContain('Open the spacing up.');
    expect(after).not.toContain('Tighten vertical spacing to fit one page.');
  });

  it('omits the template section entirely when no template is selected', () => {
    const files = service.filesFor('codex', {
      ...withTemplate,
      template: undefined,
    });
    expect(files.find((f) => f.path === 'TEMPLATE.tex')).toBeUndefined();
    const agents = files.find((f) => f.path === 'AGENTS.md')!.contents;
    expect(agents).not.toContain('TEMPLATE.tex');
  });
});
