import { Injectable } from '@nestjs/common';
import {
  AtsCheckInput,
  AtsCheckResult,
  AtsFinding,
  AtsLayout,
  AtsStructuredResume,
} from './ats.types';

/**
 * "Will an applicant-tracking system be able to read this résumé at all?"
 *
 * Deterministic by design — no model is involved. A score that moves on an
 * unchanged document destroys the only thing it is good for: telling a
 * candidate whether the edit they just made helped. Reproducibility matters
 * more here than sophistication.
 *
 * The checks model documented parser behaviour generally. They deliberately do
 * NOT claim per-vendor fidelity ("this is your Workday score") — that would be
 * unfounded, and the spec rules it out.
 */

/** Score deducted per finding, by severity. */
const PENALTY = { critical: 25, warning: 10, info: 0 } as const;

/** Below this, two text runs on a line are far enough apart to be columns. */
const COLUMN_GAP_RATIO = 0.25;

/** A line needs this many column-like rows before we call the layout multi-column. */
const COLUMN_LINE_THRESHOLD = 6;

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;

/** Heading words a parser looks for when segmenting a résumé. */
const SECTION_HEADINGS = {
  experience: ['experience', 'employment', 'work history', 'professional background'],
  education: ['education', 'academic'],
  skills: ['skills', 'technologies', 'competencies', 'technical skills'],
};

/** Date shapes seen in the wild; mixing them confuses parsers. */
const DATE_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'Mon YYYY', re: /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\b/i },
  { name: 'MM/YYYY', re: /\b\d{1,2}\/\d{4}\b/ },
  { name: 'YYYY-MM', re: /\b\d{4}-\d{1,2}\b/ },
  { name: 'MM-DD-YYYY', re: /\b\d{1,2}-\d{1,2}-\d{4}\b/ },
];

@Injectable()
export class AtsParseabilityService {
  /**
   * Score a résumé's machine-readability.
   *
   * @returns a score, the findings behind it, and the extracted text LENGTH.
   *          The text itself is never returned or stored — the report must not
   *          become a second copy of the candidate's personal data.
   */
  check(input: AtsCheckInput): AtsCheckResult {
    const text = this.flatten(input);
    const findings: AtsFinding[] = [];

    // The single most important thing to tell a candidate. A scanned image or
    // a text-as-outlines PDF is invisible to every ATS, and no other finding
    // matters until it is fixed.
    if (!text.trim()) {
      return {
        score: 0,
        extractedTextLength: 0,
        findings: [
          {
            code: 'NO_TEXT',
            severity: 'critical',
            message: 'No text could be extracted from this résumé — an ATS sees an empty document.',
            fix: 'Export a text-based PDF from your editor rather than scanning or exporting as an image.',
          },
        ],
      };
    }

    findings.push(...this.checkContact(text, input.structured));
    findings.push(...this.checkSections(text, input.structured));
    findings.push(...this.checkDateConsistency(text));
    findings.push(...this.checkLayout(input.layout));
    findings.push(...this.checkLength(text, input.layout));
    findings.push(...this.checkContent(input.structured));

    const deduction = findings.reduce((sum, f) => sum + PENALTY[f.severity], 0);
    const score = Math.max(0, Math.min(100, 100 - deduction));

    return { score, findings, extractedTextLength: text.length };
  }

  /** Flatten every available input into one searchable string. */
  private flatten(input: AtsCheckInput): string {
    const parts: string[] = [];
    if (input.text) parts.push(input.text);

    if (input.layout?.lines?.length) {
      parts.push(
        input.layout.lines.map((l) => l.segments.map((s) => s.text).join(' ')).join('\n'),
      );
    }

    if (input.structured) {
      const walk = (v: any) => {
        if (v === null || v === undefined) return;
        if (typeof v === 'string' || typeof v === 'number') {
          parts.push(String(v));
          return;
        }
        if (Array.isArray(v)) return v.forEach(walk);
        if (typeof v === 'object') Object.values(v).forEach(walk);
      };
      walk(input.structured);
    }

    return parts.join('\n');
  }

  /** A parser that cannot find contact details cannot route the application. */
  private checkContact(text: string, structured?: AtsStructuredResume): AtsFinding[] {
    const findings: AtsFinding[] = [];
    const hasEmail = !!structured?.email || EMAIL_RE.test(text);
    const hasPhone = !!structured?.phone || PHONE_RE.test(text);

    if (!hasEmail) {
      findings.push({
        code: 'NO_EMAIL',
        severity: 'critical',
        message: 'No email address was found.',
        fix: 'Put your email as plain text near the top — not inside a header, text box, or image.',
      });
    }
    if (!hasPhone) {
      findings.push({
        code: 'NO_PHONE',
        severity: 'warning',
        message: 'No phone number was found.',
        fix: 'Add a phone number as plain text alongside your email.',
      });
    }
    return findings;
  }

  /** Parsers segment on headings; unlabelled sections get merged or dropped. */
  private checkSections(text: string, structured?: AtsStructuredResume): AtsFinding[] {
    const lower = text.toLowerCase();
    const findings: AtsFinding[] = [];

    const present = (aliases: string[]) => aliases.some((a) => lower.includes(a));

    if (!present(SECTION_HEADINGS.experience) && !structured?.experience?.length) {
      findings.push({
        code: 'NO_EXPERIENCE_SECTION',
        severity: 'critical',
        message: 'No work-experience section could be identified.',
        fix: 'Add a heading called exactly "Experience" or "Work Experience" above your roles.',
      });
    }
    if (!present(SECTION_HEADINGS.education) && !structured?.education?.length) {
      findings.push({
        code: 'NO_EDUCATION_SECTION',
        severity: 'warning',
        message: 'No education section could be identified.',
        fix: 'Add a heading called "Education", even if the section is brief.',
      });
    }
    if (!present(SECTION_HEADINGS.skills) && !structured?.skills?.length) {
      findings.push({
        code: 'NO_SKILLS_SECTION',
        severity: 'warning',
        message: 'No skills section could be identified.',
        fix: 'Add a "Skills" heading with your tools and technologies listed as plain text.',
      });
    }
    return findings;
  }

  /**
   * Mixed date formats are a classic parse failure: the ATS reads one shape,
   * misreads the other, and your tenure comes out wrong.
   */
  private checkDateConsistency(text: string): AtsFinding[] {
    const found = DATE_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.name);
    if (found.length <= 1) return [];

    return [
      {
        code: 'MIXED_DATE_FORMATS',
        severity: 'warning',
        message: `Your dates mix ${found.join(' and ')} — parsers often misread one of them.`,
        fix: `Pick one format and use it everywhere. "${found[0]}" is the safest.`,
      },
    ];
  }

  /**
   * Column and table detection, from geometry rather than text.
   *
   * Multi-column layouts are the most common silent killer: the résumé looks
   * immaculate to a human and interleaves into nonsense when read left to right.
   */
  private checkLayout(layout?: AtsLayout): AtsFinding[] {
    if (!layout?.lines?.length || !layout.pageWidth) return [];

    const gapThreshold = layout.pageWidth * COLUMN_GAP_RATIO;
    const columnLines = layout.lines.filter((line) => {
      if (line.segments.length < 2) return false;
      const xs = [...line.segments].sort((a, b) => a.x - b.x);
      return xs.some((seg, i) => i > 0 && seg.x - xs[i - 1].x > gapThreshold);
    });

    if (columnLines.length < COLUMN_LINE_THRESHOLD) return [];

    return [
      {
        code: 'MULTI_COLUMN_LAYOUT',
        severity: 'critical',
        message:
          `This résumé appears to use a multi-column layout (${columnLines.length} lines with ` +
          'wide horizontal gaps). Many parsers read straight across, interleaving the columns into nonsense.',
        fix: 'Rebuild in a single column. Keep the visual polish in typography and spacing instead.',
      },
    ];
  }

  private checkLength(text: string, layout?: AtsLayout): AtsFinding[] {
    const findings: AtsFinding[] = [];
    const words = text.split(/\s+/).filter(Boolean).length;

    if (words < 150) {
      findings.push({
        code: 'TOO_SHORT',
        severity: 'warning',
        message: `Only ${words} words of content were found — thin enough that a screener may skip it.`,
        fix: 'Expand each role with what you did and what changed as a result.',
      });
    }
    if (layout?.pageCount && layout.pageCount > 3) {
      findings.push({
        code: 'TOO_LONG',
        severity: 'info',
        message: `${layout.pageCount} pages is longer than most screeners read.`,
        fix: 'Trim to two pages, keeping the most recent and most relevant roles.',
      });
    }
    return findings;
  }

  /** Structural gaps only visible when we have the builder's own document. */
  private checkContent(structured?: AtsStructuredResume): AtsFinding[] {
    if (!structured) return [];
    const findings: AtsFinding[] = [];

    const undated = (structured.experience || []).filter((e) => !e.startDate);
    if (undated.length) {
      findings.push({
        code: 'EXPERIENCE_MISSING_DATES',
        severity: 'warning',
        message: `${undated.length} role(s) have no start date, so tenure cannot be computed.`,
        fix: 'Add a start date to every role, even if approximate.',
      });
    }

    const untitled = (structured.experience || []).filter((e) => !e.title || !e.company);
    if (untitled.length) {
      findings.push({
        code: 'EXPERIENCE_MISSING_FIELDS',
        severity: 'warning',
        message: `${untitled.length} role(s) are missing a job title or employer.`,
        fix: 'Give every role both a title and an employer — parsers key on the pair.',
      });
    }

    return findings;
  }
}
