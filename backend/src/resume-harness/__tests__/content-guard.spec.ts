import { findContentProblems } from '../latex/content-guard';

/**
 * A compiled document is not a finished résumé.
 *
 * This exists because of a real report: the build reported "passing" on two
 * consecutive revisions and the PDF contained the single line
 * `< newlycreatedresumecontent >`. `latexmk` cannot tell a career from a
 * placeholder — both typeset perfectly — so something else has to.
 */

const REAL = String.raw`\documentclass{article}
\usepackage{geometry}
\begin{document}
{\Huge Jordan Reyes}
Senior Backend Engineer \textbar\ jordan@example.com
\section*{Experience}
\textbf{Staff Engineer} Stripe 2019--2024
\begin{itemize}
  \item Cut payment retry latency by 40 percent across the EU corridor.
\end{itemize}
\end{document}`;

const SKELETON = String.raw`\documentclass{article}
\begin{document}
{\Huge FULL NAME}
\ressection{Summary}
Two or three lines, written from CANDIDATE.md.
\ressection{Experience}
\resentry{Role}{Organisation}{Dates}{Location}
\end{document}`;

const PLACEHOLDERS = [
  'FULL NAME',
  'Two or three lines, written from CANDIDATE.md.',
  '\\resentry{Role}{Organisation}{Dates}{Location}',
];

describe('findContentProblems', () => {
  it('passes a résumé that carries the candidate’s own facts', () => {
    expect(
      findContentProblems({
        latex: REAL,
        placeholders: PLACEHOLDERS,
        candidateName: 'Jordan Reyes',
      }),
    ).toEqual([]);
  });

  it('catches the reported failure: a document that is only a placeholder token', () => {
    const problems = findContentProblems({
      latex: String.raw`\documentclass{article}
\begin{document}
< newlycreatedresumecontent >
\end{document}`,
      placeholders: PLACEHOLDERS,
      candidateName: 'Jordan Reyes',
    });

    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join(' ')).toMatch(/newlycreatedresumecontent/);
  });

  it('catches a compiled template — the skeleton’s own filler left in place', () => {
    const problems = findContentProblems({
      latex: SKELETON,
      placeholders: PLACEHOLDERS,
      candidateName: 'Jordan Reyes',
    });

    // Every unreplaced filler string is named, so the repair prompt can be
    // specific rather than "try again".
    expect(problems.join(' ')).toContain('FULL NAME');
    expect(problems.join(' ')).toContain('Two or three lines');
    expect(problems.join(' ')).toContain('resentry{Role}');
  });

  it('keeps the scaffolding the template wants kept', () => {
    // \ressection{Summary} is structure, not filler, and is not in the
    // placeholder list — so a document using it is not accused of being unfilled.
    const problems = findContentProblems({
      latex: REAL.replace('\\section*{Experience}', '\\ressection{Experience}'),
      placeholders: PLACEHOLDERS,
      candidateName: 'Jordan Reyes',
    });
    expect(problems).toEqual([]);
  });

  it('notices when the candidate’s own name is missing', () => {
    const problems = findContentProblems({
      latex: REAL.replace('Jordan Reyes', 'A. Candidate'),
      placeholders: PLACEHOLDERS,
      candidateName: 'Jordan Reyes',
    });
    expect(problems.join(' ')).toMatch(/Jordan Reyes/);
  });

  it('catches generic filler a template list could never enumerate', () => {
    for (const filler of [
      '[Your Name Here]',
      'Lorem ipsum dolor sit amet, consectetur.',
      'TODO: add the work history',
      '[insert achievements]',
    ]) {
      const problems = findContentProblems({
        latex: REAL.replace(
          'Cut payment retry latency by 40 percent across the EU corridor.',
          filler,
        ),
        placeholders: PLACEHOLDERS,
        candidateName: 'Jordan Reyes',
      });
      expect(problems.length).toBeGreaterThan(0);
    }
  });

  it('does not mistake ordinary LaTeX for a placeholder', () => {
    // Angle brackets appear legitimately in maths and in URLs; the guard must
    // not fire on a document that merely uses them.
    const problems = findContentProblems({
      latex: REAL.replace(
        'Cut payment retry latency by 40 percent across the EU corridor.',
        'Reduced p99 latency to \\textless 40ms across the EU corridor.',
      ),
      placeholders: PLACEHOLDERS,
      candidateName: 'Jordan Reyes',
    });
    expect(problems).toEqual([]);
  });

  it('flags a document with essentially no prose at all', () => {
    const problems = findContentProblems({
      latex: String.raw`\documentclass{article}
\begin{document}
\end{document}`,
      placeholders: [],
      candidateName: undefined,
    });
    expect(problems.length).toBeGreaterThan(0);
  });

  it('works with nothing to compare against', () => {
    // No template and no known name: the generic checks still apply, and a
    // genuine résumé still passes.
    expect(findContentProblems({ latex: REAL })).toEqual([]);
  });

  it('rejects duplicate document boundaries even when latexmk accepts them', () => {
    const problems = findContentProblems({
      latex: `${REAL}\n\\end{document}`,
      candidateName: 'Jordan Reyes',
    });
    expect(problems.join(' ')).toMatch(/exactly one.*end\{document\}/i);
  });

  it('rejects empty sections that render as ruled whitespace', () => {
    const problems = findContentProblems({
      latex: REAL.replace(
        '\\section*{Experience}\n\\textbf{Staff Engineer}',
        '\\section*{Experience}\n\\section*{Skills}\n\\textbf{Staff Engineer}',
      ),
      candidateName: 'Jordan Reyes',
    });
    expect(problems.join(' ')).toMatch(/empty section.*Experience/i);
  });

  it('rejects a career summary when the candidate has only identity and eligibility facts', () => {
    const sparse = String.raw`\documentclass{article}
\begin{document}
Harkit
\section*{Summary}
IT professional focused on software engineering and technical solutions.
\section*{Eligibility}
Sponsorship not required. Relocation not open.
\end{document}`;
    const candidateMarkdown = `# Candidate facts

## Identity

- Name: Harkit
- Email: harkit@example.com

## Eligibility

- Sponsorship: not required
- Relocation: not open
`;
    const problems = findContentProblems({
      latex: sparse,
      candidateName: 'Harkit',
      candidateMarkdown,
    });
    expect(problems.join(' ')).toMatch(/Summary.*no career evidence/i);
  });

  it('accepts a contact-only document when the profile has no career facts to add', () => {
    const contactOnly = String.raw`\documentclass{article}
\begin{document}
Harkit\\
harkit@example.com\\
Toronto
\end{document}`;
    const candidateMarkdown = `# Candidate facts

## Identity

- Name: Harkit
- Email: harkit@example.com
- Location: Toronto
`;
    expect(
      findContentProblems({
        latex: contactOnly,
        candidateName: 'Harkit',
        candidateMarkdown,
      }),
    ).toEqual([]);
  });
});
