import { AtsParseabilityService } from './ats-parseability.service';
import { AtsLayout, AtsStructuredResume } from './ats.types';

/**
 * The generic score is the number the library's ring and sort have been showing
 * as empty since they shipped. Its value depends entirely on being
 * REPRODUCIBLE — a candidate has to be able to tell whether their edit helped.
 */
describe('AtsParseabilityService', () => {
  let service: AtsParseabilityService;

  beforeEach(() => {
    service = new AtsParseabilityService();
  });

  const goodResume: AtsStructuredResume = {
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+1 555 0100',
    summary: 'Backend engineer focused on payments infrastructure and reliability.',
    skills: ['TypeScript', 'Postgres', 'Kubernetes'],
    experience: [
      {
        title: 'Senior Backend Engineer',
        company: 'Plaid',
        startDate: 'Mar 2021',
        endDate: 'Aug 2024',
        description: 'Led the onboarding rewrite and owned the payments pipeline end to end.',
        achievements: ['Cut p99 latency', 'Owned on-call rotation'],
      },
    ],
    education: [{ degree: 'BSc Computer Science', institution: 'UCL' }],
  };

  const wordy = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

  const singleColumn: AtsLayout = {
    pageWidth: 600,
    pageCount: 2,
    lines: Array.from({ length: 20 }, (_, i) => ({ y: i * 12, segments: [{ x: 40, text: 'line' }] })),
  };

  describe('the case that matters most', () => {
    it('scores 0 when no text can be extracted', () => {
      const result = service.check({ text: '' });

      expect(result.score).toBe(0);
      expect(result.findings[0].code).toBe('NO_TEXT');
      expect(result.findings[0].severity).toBe('critical');
    });

    it('says so first, rather than burying it among other findings', () => {
      const result = service.check({ text: '   ' });

      expect(result.findings).toHaveLength(1);
      expect(result.extractedTextLength).toBe(0);
    });
  });

  describe('determinism', () => {
    // Without this the score is worse than useless: a candidate cannot tell
    // whether their edit helped or the number simply moved.
    it('produces an identical score for identical input', () => {
      const a = service.check({ structured: goodResume, text: wordy(200) });
      const b = service.check({ structured: goodResume, text: wordy(200) });

      expect(a.score).toBe(b.score);
      expect(a.findings.map((f) => f.code)).toEqual(b.findings.map((f) => f.code));
    });

    it('never invokes anything asynchronous', () => {
      // A synchronous return is the structural guarantee that no model call can
      // creep into this path later.
      expect(service.check({ text: wordy(200) })).not.toBeInstanceOf(Promise);
    });
  });

  describe('every finding is actionable', () => {
    it('always carries a concrete fix', () => {
      const result = service.check({ text: 'no contact details here at all' });

      expect(result.findings.length).toBeGreaterThan(0);
      for (const finding of result.findings) {
        expect(finding.fix.trim().length).toBeGreaterThan(10);
        expect(finding.code).toMatch(/^[A-Z_]+$/);
      }
    });
  });

  describe('contact block', () => {
    it('flags a missing email as critical', () => {
      const result = service.check({ text: `${wordy(200)} +1 555 0100 Experience Education Skills` });

      expect(result.findings.some((f) => f.code === 'NO_EMAIL' && f.severity === 'critical')).toBe(true);
    });

    it('accepts an email supplied structurally', () => {
      const result = service.check({ structured: goodResume, text: wordy(200) });

      expect(result.findings.some((f) => f.code === 'NO_EMAIL')).toBe(false);
    });
  });

  describe('sections', () => {
    it('flags a résumé with no identifiable experience section', () => {
      const result = service.check({ text: `${wordy(200)} ada@example.com +1 555 0100` });

      expect(result.findings.some((f) => f.code === 'NO_EXPERIENCE_SECTION')).toBe(true);
    });

    it('accepts sections evidenced structurally', () => {
      const result = service.check({ structured: goodResume, text: wordy(200) });

      expect(result.findings.some((f) => f.code.endsWith('_SECTION'))).toBe(false);
    });
  });

  describe('date consistency', () => {
    it('flags mixed formats and names both', () => {
      const result = service.check({
        structured: goodResume,
        text: `${wordy(200)} Mar 2021 to 08/2024`,
      });

      const finding = result.findings.find((f) => f.code === 'MIXED_DATE_FORMATS');
      expect(finding).toBeDefined();
      expect(finding!.message).toMatch(/Mon YYYY/);
      expect(finding!.message).toMatch(/MM\/YYYY/);
    });

    it('is quiet when one format is used throughout', () => {
      const result = service.check({
        structured: goodResume,
        text: `${wordy(200)} Mar 2021 Aug 2024 Jan 2019`,
      });

      expect(result.findings.some((f) => f.code === 'MIXED_DATE_FORMATS')).toBe(false);
    });
  });

  describe('layout', () => {
    // The silent killer: immaculate to a human, interleaved nonsense to a parser.
    it('detects a multi-column layout from geometry', () => {
      const twoColumn: AtsLayout = {
        pageWidth: 600,
        pageCount: 2,
        lines: Array.from({ length: 12 }, (_, i) => ({
          y: i * 12,
          segments: [
            { x: 40, text: 'left column text' },
            { x: 380, text: 'right column text' },
          ],
        })),
      };

      const result = service.check({ structured: goodResume, text: wordy(200), layout: twoColumn });
      const finding = result.findings.find((f) => f.code === 'MULTI_COLUMN_LAYOUT');

      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('critical');
    });

    it('does not flag a single-column layout', () => {
      const result = service.check({ structured: goodResume, text: wordy(200), layout: singleColumn });

      expect(result.findings.some((f) => f.code === 'MULTI_COLUMN_LAYOUT')).toBe(false);
    });

    it('does not flag a couple of wide lines as columns', () => {
      const mostlySingle: AtsLayout = {
        pageWidth: 600,
        pageCount: 2,
        lines: [
          { y: 0, segments: [{ x: 40, text: 'Ada Lovelace' }, { x: 420, text: 'ada@example.com' }] },
          ...Array.from({ length: 20 }, (_, i) => ({ y: (i + 1) * 12, segments: [{ x: 40, text: 'body' }] })),
        ],
      };

      const result = service.check({ structured: goodResume, text: wordy(200), layout: mostlySingle });

      expect(result.findings.some((f) => f.code === 'MULTI_COLUMN_LAYOUT')).toBe(false);
    });
  });

  describe('content completeness', () => {
    it('flags roles with no start date', () => {
      const result = service.check({
        structured: { ...goodResume, experience: [{ title: 'Engineer', company: 'Plaid' }] },
        text: wordy(200),
      });

      expect(result.findings.some((f) => f.code === 'EXPERIENCE_MISSING_DATES')).toBe(true);
    });

    it('flags roles missing a title or employer', () => {
      const result = service.check({
        structured: { ...goodResume, experience: [{ company: 'Plaid', startDate: 'Mar 2021' }] },
        text: wordy(200),
      });

      expect(result.findings.some((f) => f.code === 'EXPERIENCE_MISSING_FIELDS')).toBe(true);
    });

    it('flags a thin résumé', () => {
      const result = service.check({ structured: goodResume, text: 'short' });

      expect(result.findings.some((f) => f.code === 'TOO_SHORT')).toBe(true);
    });
  });

  describe('scoring', () => {
    it('scores a clean résumé highly', () => {
      const result = service.check({ structured: goodResume, text: wordy(300), layout: singleColumn });

      expect(result.score).toBeGreaterThanOrEqual(90);
    });

    it('scores a résumé with critical problems far lower', () => {
      const clean = service.check({ structured: goodResume, text: wordy(300), layout: singleColumn });
      const broken = service.check({ text: `${wordy(300)} some prose with no structure` });

      expect(broken.score).toBeLessThan(clean.score);
    });

    it('never falls outside 0-100', () => {
      const result = service.check({ text: 'x' });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('reports text length but never the text itself', () => {
      const result = service.check({ structured: goodResume, text: wordy(200) });

      expect(result.extractedTextLength).toBeGreaterThan(0);
      expect(JSON.stringify(result)).not.toContain('ada@example.com');
    });
  });
});
