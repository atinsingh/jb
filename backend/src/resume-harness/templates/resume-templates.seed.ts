import type { Model } from 'mongoose';
import type {
  ResumeTemplate,
  ResumeTemplateKnob,
} from '../schemas/resume-template.schema';

/**
 * The default LaTeX template catalogue, and the seed that installs it.
 *
 * This file is data. Adding a template is an entry in `DEFAULT_RESUME_TEMPLATES`
 * plus a re-run of `npm run harness:seed-templates` — never a change in
 * `resume-harness/`, which does not branch on a template key anywhere.
 *
 * The seed is separated from the script that runs it so the idempotency
 * property can be tested against a real collection rather than asserted about
 * an array. `test/resume-templates.e2e-spec.ts` runs it three times and checks
 * there is exactly one of each.
 *
 * Every skeleton is restricted to packages present in the sandbox image
 * (`infra/agent-platform/harness.Dockerfile`): geometry, titlesec, enumitem,
 * hyperref, xcolor, parskip, microtype, helvet, mathpazo, courier. `lmodern`
 * and the TeX Gyre families are NOT installed, which is why no skeleton loads
 * `fontenc` — T1 without cm-super produces a bitmap-font build.
 */

type SeedTemplate = Omit<ResumeTemplate, 'rank' | 'isActive'> & {
  rank: number;
};

/* ----------------------------------------------------------------- knobs --- */

/**
 * Density, in the three steps a candidate actually asks for.
 *
 * The directives name the LaTeX levers rather than an adjective, because
 * "make it tighter" is exactly the instruction that produces a model deleting a
 * bullet to save a line.
 */
const density = (defaultValue = 'balanced'): ResumeTemplateKnob => ({
  key: 'density',
  label: 'Density',
  defaultValue,
  options: [
    {
      value: 'compact',
      label: 'Compact',
      directive:
        'Tighten the layout: reduce section and item spacing and narrow the ' +
        'margins toward 0.55in. Fit more on the page by removing whitespace, ' +
        'never by removing content.',
    },
    {
      value: 'balanced',
      label: 'Balanced',
      directive:
        'Keep the spacing and margins the skeleton defines. This is the ' +
        'template as designed.',
    },
    {
      value: 'airy',
      label: 'Airy',
      directive:
        'Open the layout up: increase spacing between sections and entries and ' +
        'widen the margins toward 0.95in. A second page is acceptable here.',
    },
  ],
});

/** Colour, for the templates whose headings are actually coloured. */
const accent = (): ResumeTemplateKnob => ({
  key: 'accent',
  label: 'Accent',
  defaultValue: 'slate',
  options: [
    {
      value: 'none',
      label: 'None',
      directive:
        'Set the accent colour to black. The document must read as pure ' +
        'black-and-white, including rules and headings.',
    },
    {
      value: 'slate',
      label: 'Slate',
      directive:
        'Set the accent colour to a dark slate grey-blue, defined as ' +
        'RGB 45,55,72.',
    },
    {
      value: 'navy',
      label: 'Navy',
      directive: 'Set the accent colour to a deep navy, defined as RGB 23,42,84.',
    },
    {
      value: 'burgundy',
      label: 'Burgundy',
      directive:
        'Set the accent colour to a muted burgundy, defined as RGB 122,32,44.',
    },
    {
      value: 'forest',
      label: 'Forest',
      directive:
        'Set the accent colour to a deep forest green, defined as RGB 26,74,54.',
    },
  ],
});

/**
 * Section order.
 *
 * Ordering is a real editorial decision — a career changer leads with skills, a
 * new graduate with education — so it is a knob rather than a fixed property of
 * the template.
 */
const order = (defaultValue = 'experience-first'): ResumeTemplateKnob => ({
  key: 'order',
  label: 'Section order',
  defaultValue,
  options: [
    {
      value: 'experience-first',
      label: 'Experience first',
      directive:
        'Order the sections: Summary, Experience, Skills, Education, then ' +
        'anything else.',
    },
    {
      value: 'skills-first',
      label: 'Skills first',
      directive:
        'Order the sections: Summary, Skills, Experience, Education, then ' +
        'anything else. Group the skills so the section reads as evidence, not ' +
        'a keyword dump.',
    },
    {
      value: 'education-first',
      label: 'Education first',
      directive:
        'Order the sections: Summary, Education, Experience, Skills, then ' +
        'anything else. Use this shape only while the degree is the strongest ' +
        'credential.',
    },
  ],
});

/** How the bullets are worded. Wording only — never what they claim. */
const tone = (): ResumeTemplateKnob => ({
  key: 'tone',
  label: 'Tone',
  defaultValue: 'plain',
  options: [
    {
      value: 'plain',
      label: 'Plain',
      directive:
        'Write bullets in plain, direct language. State what was done and what ' +
        'resulted, with no adjectives that are not in CANDIDATE.md.',
    },
    {
      value: 'impact',
      label: 'Impact-led',
      directive:
        'Lead each bullet with the outcome, then the action that produced it. ' +
        'Use only numbers that already appear in CANDIDATE.md; if a bullet has ' +
        'no number, lead with the outcome in words rather than inventing one.',
    },
    {
      value: 'technical',
      label: 'Technical',
      directive:
        'Foreground systems, scale and the specific technologies named in ' +
        'CANDIDATE.md. Name the stack in the bullet rather than only in the ' +
        'skills section. Do not add a technology that is not on file.',
    },
  ],
});

/** Heading treatment, for templates that vary it rather than the colour. */
const headingStyle = (): ResumeTemplateKnob => ({
  key: 'headingStyle',
  label: 'Headings',
  defaultValue: 'smallcaps',
  options: [
    {
      value: 'smallcaps',
      label: 'Small caps',
      directive:
        'Render section headings in small caps with the horizontal rule the ' +
        'skeleton defines.',
    },
    {
      value: 'bold',
      label: 'Bold',
      directive:
        'Render section headings in bold upper case with a slightly heavier ' +
        'rule beneath.',
    },
    {
      value: 'italic',
      label: 'Italic',
      directive:
        'Render section headings in italic title case and drop the rule ' +
        'beneath them entirely.',
    },
  ],
});

/* ---------------------------------------------------------- placeholders --- */

/**
 * The filler in each skeleton that a finished résumé must not still contain.
 *
 * Listed explicitly rather than derived from the skeleton, because a skeleton
 * line is either scaffolding to keep (`\ressection{Summary}`) or filler to
 * replace ("Two or three lines…"), and only whoever wrote the template knows
 * which. `ResumeContentGuard` reads this to catch the case a compiler cannot:
 * a document that typesets perfectly and says nothing about anybody.
 */
const fillerLines = (contactSeparator: 'dot' | 'bar'): string[] => [
  'FULL NAME',
  contactSeparator === 'dot'
    ? 'Email \\textperiodcentered\\ Phone \\textperiodcentered\\ Location \\textperiodcentered\\ LinkedIn'
    : 'Email \\textbar\\ Phone \\textbar\\ Location \\textbar\\ LinkedIn',
  'Two or three lines, written from CANDIDATE.md.',
  "Achievement, in the candidate's own facts.",
  'Grouped, comma separated.',
  '\\resentry{Role}{Organisation}{Dates}{Location}',
  '\\resentry{Degree}{Institution}{Dates}{Location}',
];

/* -------------------------------------------------------------- previews --- */

/**
 * Layout previews, drawn rather than compiled.
 *
 * `currentColor` throughout so a preview reads correctly in both themes without
 * the seed knowing anything about the palette.
 */
const preview = (bars: string): string =>
  `<svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">` +
  `<rect x="0" y="0" width="100" height="130" fill="none"/>${bars}</svg>`;

const bar = (
  x: number,
  y: number,
  w: number,
  h: number,
  opacity = 0.25,
): string =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.6" fill="currentColor" opacity="${opacity}"/>`;

/* ------------------------------------------------------------- templates --- */

export const DEFAULT_RESUME_TEMPLATES: SeedTemplate[] = [
  {
    key: 'classic-serif',
    name: 'Classic Serif',
    description:
      'Centred name, small-caps headings, ruled sections. The shape a hiring manager has read a thousand times, which is the point.',
    rank: 10,
    previewSvg: preview(
      [
        bar(30, 12, 40, 4, 0.55),
        bar(26, 20, 48, 2, 0.3),
        bar(10, 32, 26, 2.4, 0.45),
        bar(10, 36, 80, 0.6, 0.3),
        bar(10, 42, 80, 1.6),
        bar(10, 46, 74, 1.6),
        bar(10, 56, 22, 2.4, 0.45),
        bar(10, 60, 80, 0.6, 0.3),
        bar(10, 66, 80, 1.6),
        bar(10, 70, 68, 1.6),
        bar(10, 74, 76, 1.6),
        bar(10, 84, 24, 2.4, 0.45),
        bar(10, 88, 80, 0.6, 0.3),
        bar(10, 94, 72, 1.6),
        bar(10, 98, 80, 1.6),
      ].join(''),
    ),
    constraints: [
      'Keep the centred header block: name on its own line, then a single contact line.',
      'Keep \\ressection for every section heading. Do not replace it with \\section.',
      'Single column throughout. Never place the contact details in a side column.',
    ],
    placeholders: fillerLines('dot'),
    knobs: [density(), headingStyle(), order(), tone()],
    skeleton: String.raw`% Classic Serif - Jobocate résumé template
% Computer Modern, centred header, small-caps ruled section headings.
\documentclass[11pt,letterpaper]{article}

\usepackage[margin=0.75in]{geometry}
\usepackage{titlesec}
\usepackage{enumitem}
\usepackage{parskip}
\usepackage{microtype}
\usepackage[hidelinks]{hyperref}

% Section headings: small caps, with a rule underneath.
\titleformat{\section}{\normalfont\scshape\large}{}{0pt}{}[\vspace{-0.6em}\rule{\textwidth}{0.4pt}]
\titlespacing*{\section}{0pt}{1.1em}{0.6em}

\setlist[itemize]{leftmargin=1.2em,itemsep=0.15em,topsep=0.25em,parsep=0pt}
\pagestyle{empty}

% One entry in the experience or education list.
% #1 role  #2 organisation  #3 dates  #4 location
\newcommand{\resentry}[4]{%
  \noindent\textbf{#1}\hfill{\small #3}\\
  \textit{#2}\hfill{\small #4}\par\vspace{0.2em}}

% Every section heading goes through this, so the look stays consistent.
\newcommand{\ressection}[1]{\section*{#1}}

\begin{document}

\begin{center}
  {\LARGE FULL NAME}\\[0.35em]
  {\small Email \textperiodcentered\ Phone \textperiodcentered\ Location \textperiodcentered\ LinkedIn}
\end{center}
\vspace{0.6em}

\ressection{Summary}
Two or three lines, written from CANDIDATE.md.

\ressection{Experience}
\resentry{Role}{Organisation}{Dates}{Location}
\begin{itemize}
  \item Achievement, in the candidate's own facts.
\end{itemize}

\ressection{Skills}
Grouped, comma separated.

\ressection{Education}
\resentry{Degree}{Institution}{Dates}{Location}

\end{document}
`,
  },

  {
    key: 'modern-sans',
    name: 'Modern Sans',
    description:
      'Left-aligned name over a heavy accent rule, Helvetica throughout. Reads as current without being decorative.',
    rank: 20,
    previewSvg: preview(
      [
        bar(10, 12, 46, 5, 0.55),
        bar(10, 20, 80, 1.4, 0.5),
        bar(10, 25, 56, 2, 0.3),
        bar(10, 38, 24, 2.6, 0.5),
        bar(10, 44, 80, 1.6),
        bar(10, 48, 70, 1.6),
        bar(10, 58, 30, 2.6, 0.5),
        bar(10, 64, 80, 1.6),
        bar(10, 68, 76, 1.6),
        bar(10, 72, 64, 1.6),
        bar(10, 82, 20, 2.6, 0.5),
        bar(10, 88, 80, 1.6),
        bar(10, 92, 58, 1.6),
        bar(10, 102, 26, 2.6, 0.5),
        bar(10, 108, 74, 1.6),
      ].join(''),
    ),
    constraints: [
      'Keep the left-aligned header and the accent rule directly beneath the name.',
      'Keep the sans-serif family. Do not switch the document to a serif face.',
      'Section headings stay in the accent colour; body text stays black.',
    ],
    placeholders: fillerLines('bar'),
    knobs: [density(), accent(), order(), tone()],
    skeleton: String.raw`% Modern Sans - Jobocate résumé template
% Helvetica, left-aligned header, accent rule, coloured section headings.
\documentclass[11pt,letterpaper]{article}

\usepackage[margin=0.7in]{geometry}
\usepackage{helvet}
\renewcommand{\familydefault}{\sfdefault}
\usepackage{xcolor}
\usepackage{titlesec}
\usepackage{enumitem}
\usepackage{parskip}
\usepackage{microtype}
\usepackage[hidelinks]{hyperref}

% The one place the accent is defined. Changing the look changes this line.
\definecolor{accent}{RGB}{45,55,72}

\titleformat{\section}{\normalfont\bfseries\large\color{accent}}{}{0pt}{}
\titlespacing*{\section}{0pt}{1.2em}{0.45em}

\setlist[itemize]{leftmargin=1.1em,itemsep=0.15em,topsep=0.25em,parsep=0pt}
\pagestyle{empty}

\newcommand{\resentry}[4]{%
  \noindent\textbf{#1} \textcolor{accent}{\textbar} #2\hfill{\small #3, #4}\par\vspace{0.2em}}

\newcommand{\ressection}[1]{\section*{#1}}

\begin{document}

{\Huge\bfseries FULL NAME}\par\vspace{0.3em}
{\color{accent}\rule{\textwidth}{1.6pt}}\par\vspace{0.4em}
{\small Email \textbar\ Phone \textbar\ Location \textbar\ LinkedIn}
\vspace{0.5em}

\ressection{Summary}
Two or three lines, written from CANDIDATE.md.

\ressection{Experience}
\resentry{Role}{Organisation}{Dates}{Location}
\begin{itemize}
  \item Achievement, in the candidate's own facts.
\end{itemize}

\ressection{Skills}
Grouped, comma separated.

\ressection{Education}
\resentry{Degree}{Institution}{Dates}{Location}

\end{document}
`,
  },

  {
    key: 'compact-ats',
    name: 'Compact ATS',
    description:
      'No colour, no rules, no cleverness. Built to survive a parser first and impress a human second.',
    rank: 30,
    previewSvg: preview(
      [
        bar(10, 12, 38, 3.4, 0.5),
        bar(10, 18, 68, 1.8, 0.3),
        bar(10, 28, 22, 2.2, 0.45),
        bar(10, 33, 80, 1.5),
        bar(10, 36.5, 78, 1.5),
        bar(10, 44, 26, 2.2, 0.45),
        bar(10, 49, 80, 1.5),
        bar(10, 52.5, 74, 1.5),
        bar(10, 56, 80, 1.5),
        bar(10, 59.5, 66, 1.5),
        bar(10, 67, 20, 2.2, 0.45),
        bar(10, 72, 80, 1.5),
        bar(10, 75.5, 80, 1.5),
        bar(10, 79, 70, 1.5),
        bar(10, 86, 24, 2.2, 0.45),
        bar(10, 91, 80, 1.5),
        bar(10, 94.5, 62, 1.5),
        bar(10, 102, 28, 2.2, 0.45),
        bar(10, 107, 80, 1.5),
        bar(10, 110.5, 72, 1.5),
      ].join(''),
    ),
    constraints: [
      'No colour anywhere. No rules, boxes, icons or glyphs that are not plain text.',
      'Section headings must be ordinary words a parser recognises: Summary, Experience, Skills, Education.',
      'Never use tabular for layout. One column, linear reading order, top to bottom.',
    ],
    placeholders: fillerLines('bar'),
    knobs: [density('compact'), order(), tone()],
    skeleton: String.raw`% Compact ATS - Jobocate résumé template
% Deliberately plain: maximum parser survivability, minimum decoration.
\documentclass[10pt,letterpaper]{article}

\usepackage[margin=0.6in]{geometry}
\usepackage{titlesec}
\usepackage{enumitem}
\usepackage{parskip}
\usepackage[hidelinks]{hyperref}

% Bold upper-case headings, no rule. A parser reads the word, not the styling.
\titleformat{\section}{\normalfont\bfseries\normalsize}{}{0pt}{\MakeUppercase}
\titlespacing*{\section}{0pt}{0.85em}{0.35em}

\setlist[itemize]{leftmargin=1em,itemsep=0.05em,topsep=0.15em,parsep=0pt}
\pagestyle{empty}

\newcommand{\resentry}[4]{%
  \noindent\textbf{#1}, #2 \hfill {\small #3}\\
  {\small #4}\par\vspace{0.15em}}

\newcommand{\ressection}[1]{\section*{#1}}

\begin{document}

\noindent{\large\textbf{FULL NAME}}\\
Email \textbar\ Phone \textbar\ Location \textbar\ LinkedIn
\vspace{0.3em}

\ressection{Summary}
Two or three lines, written from CANDIDATE.md.

\ressection{Experience}
\resentry{Role}{Organisation}{Dates}{Location}
\begin{itemize}
  \item Achievement, in the candidate's own facts.
\end{itemize}

\ressection{Skills}
Grouped, comma separated.

\ressection{Education}
\resentry{Degree}{Institution}{Dates}{Location}

\end{document}
`,
  },

  {
    key: 'executive-serif',
    name: 'Executive Serif',
    description:
      'Palatino, wide margins, letter-spaced headings. Space on the page reads as seniority; use it when the record can carry it.',
    rank: 40,
    previewSvg: preview(
      [
        bar(22, 14, 56, 5, 0.55),
        bar(30, 23, 40, 1.8, 0.3),
        bar(38, 29, 24, 0.8, 0.4),
        bar(16, 42, 30, 2.2, 0.45),
        bar(16, 49, 68, 1.6),
        bar(16, 53.5, 60, 1.6),
        bar(16, 65, 26, 2.2, 0.45),
        bar(16, 72, 68, 1.6),
        bar(16, 76.5, 64, 1.6),
        bar(16, 81, 52, 1.6),
        bar(16, 93, 22, 2.2, 0.45),
        bar(16, 100, 68, 1.6),
        bar(16, 104.5, 58, 1.6),
      ].join(''),
    ),
    constraints: [
      'Keep the centred header and the short accent rule beneath it.',
      'Keep the Palatino family loaded by mathpazo. Do not switch to a sans face.',
      'Preserve the generous section spacing; this template earns its keep through whitespace.',
    ],
    placeholders: fillerLines('dot'),
    knobs: [density('airy'), accent(), order(), tone()],
    skeleton: String.raw`% Executive Serif - Jobocate résumé template
% Palatino, wide margins, letter-spaced small-caps headings.
\documentclass[11pt,letterpaper]{article}

\usepackage[margin=0.95in]{geometry}
\usepackage{mathpazo}
\usepackage{xcolor}
\usepackage{titlesec}
\usepackage{enumitem}
\usepackage{parskip}
\usepackage{microtype}
\usepackage[hidelinks]{hyperref}

\definecolor{accent}{RGB}{45,55,72}

\titleformat{\section}{\normalfont\scshape\large\color{accent}}{}{0pt}{}
\titlespacing*{\section}{0pt}{1.6em}{0.7em}

\setlist[itemize]{leftmargin=1.3em,itemsep=0.3em,topsep=0.4em,parsep=0pt}
\pagestyle{empty}

\newcommand{\resentry}[4]{%
  \noindent{\large #1}\hfill{\small #3}\\
  \textit{#2}\hfill{\small #4}\par\vspace{0.3em}}

\newcommand{\ressection}[1]{\section*{#1}}

\begin{document}

\begin{center}
  {\Huge FULL NAME}\\[0.5em]
  {\small Email \textperiodcentered\ Phone \textperiodcentered\ Location \textperiodcentered\ LinkedIn}\\[0.7em]
  {\color{accent}\rule{2.2cm}{0.8pt}}
\end{center}
\vspace{0.8em}

\ressection{Summary}
Two or three lines, written from CANDIDATE.md.

\ressection{Experience}
\resentry{Role}{Organisation}{Dates}{Location}
\begin{itemize}
  \item Achievement, in the candidate's own facts.
\end{itemize}

\ressection{Skills}
Grouped, comma separated.

\ressection{Education}
\resentry{Degree}{Institution}{Dates}{Location}

\end{document}
`,
  },

  {
    key: 'technical-ledger',
    name: 'Technical Ledger',
    description:
      'Monospace header and skills over a serif body. Signals engineer without turning the page into a terminal.',
    rank: 50,
    previewSvg: preview(
      [
        bar(10, 12, 44, 4, 0.55),
        bar(10, 19, 62, 1.6, 0.35),
        bar(10, 24, 80, 0.6, 0.4),
        bar(10, 34, 4, 2.4, 0.5),
        bar(16, 34, 22, 2.4, 0.45),
        bar(10, 40, 80, 1.6),
        bar(10, 44, 72, 1.6),
        bar(10, 54, 4, 2.4, 0.5),
        bar(16, 54, 28, 2.4, 0.45),
        bar(10, 60, 80, 1.6),
        bar(10, 64, 76, 1.6),
        bar(10, 68, 62, 1.6),
        bar(10, 78, 4, 2.4, 0.5),
        bar(16, 78, 18, 2.4, 0.45),
        bar(10, 84, 36, 2, 0.35),
        bar(50, 84, 40, 2, 0.35),
        bar(10, 89, 30, 2, 0.35),
        bar(44, 89, 46, 2, 0.35),
        bar(10, 99, 4, 2.4, 0.5),
        bar(16, 99, 24, 2.4, 0.45),
        bar(10, 105, 80, 1.6),
      ].join(''),
    ),
    constraints: [
      'Keep the monospace treatment on the name, the contact line and the skills section.',
      'Body text and bullets stay in the serif family; do not set the whole document in monospace.',
      'Keep the accent marker before each section heading.',
    ],
    placeholders: fillerLines('bar'),
    knobs: [density('compact'), accent(), tone()],
    skeleton: String.raw`% Technical Ledger - Jobocate résumé template
% Monospace header and skills, serif body, accent marker on headings.
\documentclass[10pt,letterpaper]{article}

\usepackage[margin=0.7in]{geometry}
\usepackage{courier}
\usepackage{xcolor}
\usepackage{titlesec}
\usepackage{enumitem}
\usepackage{parskip}
\usepackage{microtype}
\usepackage[hidelinks]{hyperref}

\definecolor{accent}{RGB}{45,55,72}

% A small filled marker before the heading text, in the accent colour.
\titleformat{\section}{\normalfont\bfseries\normalsize}{}{0pt}{\textcolor{accent}{\rule[0.05em]{0.5em}{0.5em}}\hspace{0.5em}}
\titlespacing*{\section}{0pt}{1.1em}{0.4em}

\setlist[itemize]{leftmargin=1.1em,itemsep=0.12em,topsep=0.2em,parsep=0pt}
\pagestyle{empty}

\newcommand{\resentry}[4]{%
  \noindent\textbf{#1} --- #2\hfill{\small\texttt{#3}}\\
  {\small #4}\par\vspace{0.2em}}

\newcommand{\ressection}[1]{\section*{#1}}

\begin{document}

\noindent{\Large\texttt{\textbf{FULL NAME}}}\par\vspace{0.25em}
\noindent{\small\texttt{Email \textbar\ Phone \textbar\ Location \textbar\ LinkedIn}}\par\vspace{0.3em}
{\color{accent}\rule{\textwidth}{0.7pt}}
\vspace{0.4em}

\ressection{Summary}
Two or three lines, written from CANDIDATE.md.

\ressection{Experience}
\resentry{Role}{Organisation}{Dates}{Location}
\begin{itemize}
  \item Achievement, in the candidate's own facts.
\end{itemize}

\ressection{Skills}
\noindent{\small\texttt{Languages}}\quad Grouped, comma separated.

\ressection{Education}
\resentry{Degree}{Institution}{Dates}{Location}

\end{document}
`,
  },
];

/**
 * Installs the catalogue. Safe to run any number of times.
 *
 * Upserts on `key` and rewrites the whole body, so this is also how a template
 * is *edited*: change the entry above, re-run the script, and the stored
 * document matches again. `isActive` is set on every run so a template disabled
 * by hand comes back rather than staying silently missing from the picker.
 */
export async function seedResumeTemplates(
  templateModel: Model<any>,
): Promise<number> {
  for (const template of DEFAULT_RESUME_TEMPLATES) {
    await templateModel.updateOne(
      { key: template.key },
      { $set: { ...template, isActive: true } },
      { upsert: true },
    );
  }
  return DEFAULT_RESUME_TEMPLATES.length;
}
