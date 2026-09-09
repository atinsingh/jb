/**
 * Tells a finished résumé from a compiled template.
 *
 * `latexmk` exiting 0 says the document typesets. It says nothing about
 * whether the document is about anybody. Filler typesets exactly as cleanly as
 * a career, which is how a session can report "revision 1 · build passing",
 * then "revision 2 · build passing", and hand back a PDF whose entire content
 * is `< newlycreatedresumecontent >`. That happened, and it is what this file
 * exists to stop.
 *
 * The checks are deliberately cheap and deterministic — no model is asked
 * whether the résumé is good, only whether it still looks like scaffolding.
 * Being wrong here is expensive in both directions: a false positive burns a
 * repair turn on a good document, a false negative ships a blank one.
 */

export interface ContentGuardInput {
  /** The LaTeX the harness produced. */
  latex: string;
  /**
   * Filler strings declared by the active template. A finished résumé must
   * contain none of them; the template's scaffolding is deliberately absent
   * from this list.
   */
  placeholders?: string[];
  /** The candidate's name, when the profile has one. */
  candidateName?: string;
  /** Exact factual source written to the sandbox for this session. */
  candidateMarkdown?: string;
}

/**
 * Filler no template list could enumerate, because it comes from the model
 * rather than from the skeleton.
 *
 * Each pattern is anchored to something a real résumé would not say. Angle
 * brackets are the interesting case: `<...>` is not LaTeX a résumé writes by
 * hand, and it is exactly the shape a model emits when it means "your content
 * goes here" — but `\textless` and maths mode use them legitimately, so the
 * pattern requires a bare `<` that is not part of a control sequence.
 */
const GENERIC_FILLER: { pattern: RegExp; describe: (m: string) => string }[] = [
  {
    pattern:
      /(?<!\\text)(?<![a-zA-Z\\])<\s*[A-Za-z][A-Za-z0-9 _./-]{2,60}\s*>/g,
    describe: (m) => `a placeholder token ${m.trim()} is still in the document`,
  },
  {
    pattern:
      /\[(?:your|insert|add|candidate|name|company|role)[^\]\n]{0,60}\]/gi,
    describe: (m) =>
      `a bracketed placeholder ${m.trim()} is still in the document`,
  },
  {
    pattern: /\bTODO\b[^\n]{0,60}/g,
    describe: (m) =>
      `an unfinished note "${m.trim()}" is still in the document`,
  },
  {
    pattern: /\bLorem ipsum\b[^\n]{0,60}/gi,
    describe: () => 'the document contains Lorem ipsum filler text',
  },
];

/** Body text between \begin{document} and \end{document}, commands stripped. */
function prose(latex: string): string {
  const body = /\\begin\{document\}([\s\S]*?)\\end\{document\}/.exec(latex);
  return (
    (body ? body[1] : latex)
      // Drop comments, commands and their braces so what remains is words.
      .replace(/(^|[^\\])%.*$/gm, '$1')
      .replace(/\\[a-zA-Z@]+\*?(\[[^\]]*\])?/g, ' ')
      .replace(/[{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Everything wrong with this document, in words a harness can act on.
 *
 * Empty means the document looks like somebody's résumé. Each entry is phrased
 * as a instruction-ready statement, because it is fed straight back into a
 * repair turn.
 */
export function findContentProblems(input: ContentGuardInput): string[] {
  const { latex, placeholders = [], candidateName, candidateMarkdown } = input;
  const problems: string[] = [];

  const beginCount = latex.match(/\\begin\{document\}/g)?.length || 0;
  const endCount = latex.match(/\\end\{document\}/g)?.length || 0;
  if (beginCount !== 1) {
    problems.push(
      `the file must contain exactly one \\begin{document}; found ${beginCount}`,
    );
  }
  if (endCount !== 1) {
    problems.push(
      `the file must contain exactly one \\end{document}; found ${endCount}`,
    );
  }

  // 1. The template's own filler, still in place. This is the precise check:
  //    the template author said these strings are scaffolding to replace.
  for (const filler of placeholders) {
    if (filler && latex.includes(filler)) {
      problems.push(
        `the template's placeholder text "${filler}" was never replaced`,
      );
    }
  }

  // 2. Filler the model invented. A template list cannot anticipate this.
  for (const { pattern, describe } of GENERIC_FILLER) {
    const found = latex.match(new RegExp(pattern.source, pattern.flags));
    if (found?.length) problems.push(describe(found[0]));
  }

  const words = prose(latex);
  const candidateHasCareerEvidence = candidateMarkdown
    ? /^(?:##\s+(?:Experience|Education|Skills|Certifications|Achievements)\s*|-\s*Headline\s*:|Summary\s*:)/im.test(
        candidateMarkdown,
      )
    : undefined;

  // 3. A compiler accepts duplicate document endings and empty section
  // scaffolding, but both render as a broken candidate document.
  const sections = [
    ...latex.matchAll(/\\(?:ressection|section\*?)\{([^}]+)\}/g),
  ];
  for (let index = 0; index < sections.length; index++) {
    const section = sections[index];
    const bodyStart = (section.index || 0) + section[0].length;
    const closing = latex.indexOf('\\end{document}', bodyStart);
    const bodyEnd =
      index + 1 < sections.length
        ? sections[index + 1].index || latex.length
        : closing === -1
          ? latex.length
          : closing;
    if (plainText(latex.slice(bodyStart, bodyEnd)).length === 0) {
      problems.push(`the empty section "${section[1]}" must be removed`);
    }
  }

  // 4. The candidate file can prove that whole biographical categories are
  // absent. Enforce that cheap fact deterministically instead of asking the
  // same model that wrote the document to grade itself.
  if (candidateMarkdown) {
    const candidateSections = new Set(
      [...candidateMarkdown.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) =>
        normalizeHeading(m[1]),
      ),
    );
    const guardedSections: Record<string, string> = {
      experience: 'Experience',
      education: 'Education',
      skills: 'Skills',
      certifications: 'Certifications',
      certification: 'Certifications',
      achievements: 'Achievements',
      achievement: 'Achievements',
    };
    for (const section of sections) {
      const normalized = normalizeHeading(section[1]);
      const sourceHeading = guardedSections[normalized];
      if (
        sourceHeading &&
        !candidateSections.has(normalizeHeading(sourceHeading))
      ) {
        problems.push(
          `the resume has a ${section[1]} section but CANDIDATE.md has no ${sourceHeading} facts`,
        );
      }
    }

    const hasSummary = sections.some((section) =>
      /^(?:summary|profile|objective)$/.test(normalizeHeading(section[1])),
    );
    if (hasSummary && !candidateHasCareerEvidence) {
      problems.push(
        'the resume has a Summary section but CANDIDATE.md contains no career evidence to summarize',
      );
    }
  }

  // 5. A résumé that never says the candidate's name is not their résumé.
  //    Matched on the surname as well as the full string, because a document
  //    may legitimately split the name across formatting commands.
  if (candidateName) {
    const surname = candidateName.trim().split(/\s+/).pop() || candidateName;
    const hasName =
      latex.includes(candidateName) ||
      (surname.length > 2 &&
        new RegExp(`\\b${escapeRegExp(surname)}\\b`, 'i').test(latex));
    if (!hasName) {
      problems.push(
        `the document never names the candidate — "${candidateName}" does not appear in it`,
      );
    }
  }

  // 6. Nothing was written at all. A document with a preamble and no body
  //    compiles to a blank page, which is the most literal version of this bug.
  if (words.length < 40 && candidateHasCareerEvidence !== false) {
    problems.push(
      `the document has almost no content — ${words.length} characters of text outside its LaTeX commands`,
    );
  }

  return problems;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function plainText(value: string): string {
  return value
    .replace(/(^|[^\\])%.*$/gm, '$1')
    .replace(/\\[a-zA-Z@]+\*?(\[[^\]]*\])?/g, ' ')
    .replace(/[{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHeading(value: string): string {
  return value.toLowerCase().replace(/[^a-z]+/g, '');
}
