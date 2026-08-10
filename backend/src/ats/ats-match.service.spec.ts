import { AtsMatchService } from './ats-match.service';
import { AtsStructuredResume } from './ats.types';

describe('AtsMatchService', () => {
  let service: AtsMatchService;

  beforeEach(() => {
    service = new AtsMatchService();
  });

  const resume: AtsStructuredResume = {
    summary: 'Backend engineer working in TypeScript and Postgres.',
    skills: ['TypeScript', 'Postgres', 'Docker'],
    experience: [
      { title: 'Backend Engineer', company: 'Plaid', description: 'Built services with Node.js.' },
    ],
  };

  describe('coverage', () => {
    // Concepts come back in the taxonomy's canonical casing, not lowercased.
    it('reports what the résumé evidences and what it does not', () => {
      const result = service.match(resume, 'We need TypeScript, Postgres and Kubernetes experience.');

      expect(result.matched).toEqual(expect.arrayContaining(['TypeScript', 'PostgreSQL']));
      expect(result.missing).toEqual(expect.arrayContaining(['Kubernetes']));
      expect(result.coverage).toBeGreaterThan(0);
      expect(result.coverage).toBeLessThan(100);
    });

    it('returns 100 when everything asked for is present', () => {
      const result = service.match(resume, 'TypeScript and Postgres.');

      expect(result.coverage).toBe(100);
      expect(result.missing).toEqual([]);
    });

    it('returns 0 with nothing to match when the JD is empty', () => {
      const result = service.match(resume, '');

      expect(result).toEqual({ coverage: 0, matched: [], missing: [], keywordCount: 0 });
    });
  });

  describe('vocabulary', () => {
    // Uses the same taxonomy as job matching, so the two cannot disagree about
    // whether a candidate "has TypeScript".
    it('treats an abbreviation and its full name as one concept', () => {
      const result = service.match({ skills: ['TS'] }, 'We use TypeScript.');

      expect(result.matched).toContain('TypeScript');
      expect(result.coverage).toBe(100);
    });

    // Regression: an earlier version treated every non-stopword as a
    // requirement, so "use" and "needed" counted as things the candidate had
    // failed to demonstrate and coverage was noise.
    it('counts only recognised skills as requirements', () => {
      const result = service.match({ skills: ['TypeScript'] }, 'You will use TypeScript daily.');

      expect(result.keywordCount).toBe(1);
      expect(result.coverage).toBe(100);
    });

    it('survives punctuation-heavy technology names', () => {
      const result = service.match({ skills: ['Node.js', 'C++'] }, 'Requires Node.js and C++.');

      expect(result.coverage).toBeGreaterThan(0);
    });

    it('ignores filler words that carry no signal', () => {
      const result = service.match(resume, 'You will have strong experience working with the team.');

      // Everything here is a stopword, so there is nothing to score against.
      expect(result.keywordCount).toBe(0);
    });
  });

  describe('inputs', () => {
    it('accepts a plain string résumé', () => {
      const result = service.match('I write TypeScript and Postgres queries.', 'TypeScript needed.');

      expect(result.coverage).toBe(100);
    });

    it('searches the whole structured document, not just the skills list', () => {
      // "node" appears only in an experience description.
      const result = service.match(resume, 'Node.js required.');

      expect(result.matched.length).toBeGreaterThan(0);
    });
  });

  describe('what it must not do', () => {
    it('is a pure computation with no persistence surface', () => {
      // Ephemeral by design: the JD-relative number must never overwrite the
      // stored generic atsScore, which answers a different question.
      expect(service.match(resume, 'TypeScript')).not.toBeInstanceOf(Promise);
      expect(Object.keys(service.match(resume, 'TypeScript')).sort()).toEqual([
        'coverage',
        'keywordCount',
        'matched',
        'missing',
      ]);
    });
  });
});
