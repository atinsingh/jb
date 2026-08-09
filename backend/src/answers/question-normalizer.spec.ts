import { normalizeQuestion, questionKeyFor, matchesPattern } from './question-normalizer';

describe('normalizeQuestion', () => {
  it('lowercases, strips punctuation and collapses whitespace', () => {
    expect(normalizeQuestion('  What   is your NOTICE period?  ').normalized).toBe('what notice period');
  });

  it('strips markup and entities', () => {
    expect(normalizeQuestion('<b>Notice&nbsp;period</b>').normalized).toBe('notice period');
  });

  it('strips required/optional label noise', () => {
    expect(normalizeQuestion('Notice period *').normalized).toBe('notice period');
    expect(normalizeQuestion('Notice period (required)').normalized).toBe('notice period');
  });

  it('removes the employer name so the same question matches across companies', () => {
    const a = normalizeQuestion('Why do you want to work at Acme?', 'Acme');
    const b = normalizeQuestion('Why do you want to work at Globex?', 'Globex');

    expect(a.key).toBe(b.key);
  });

  it('produces a stable key for the same question', () => {
    expect(normalizeQuestion('Notice period').key).toBe(normalizeQuestion('  notice  PERIOD  ').key);
  });

  describe('country detection', () => {
    it('reads a spelled-out country', () => {
      expect(normalizeQuestion('Are you legally authorized to work in the United States?').country).toBe('US');
    });

    // Regression: 'us' was a stopword, which destroyed the country signal here.
    it('reads bare ATS shorthand', () => {
      expect(normalizeQuestion('Do you have US work authorization?').country).toBe('US');
      expect(normalizeQuestion('Do you have the right to work in the UK?').country).toBe('GB');
    });

    it('reads Canada', () => {
      expect(normalizeQuestion('Are you authorized to work in Canada?').country).toBe('CA');
    });

    it('does not pin a bloc to a single member state', () => {
      expect(normalizeQuestion('Do you have the right to work in the EU?').country).toBeNull();
    });

    it('is null when no country is named', () => {
      expect(normalizeQuestion('What is your expected salary?').country).toBeNull();
    });
  });

  describe('semantic merging via catalog patterns', () => {
    // The normalizer alone does not merge these two phrasings — that is the
    // catalog's job. What matters is that ONE pattern set matches both.
    const phrasings = [
      'Are you legally authorized to work in the United States?',
      'Do you have US work authorization?',
      'Are you authorized to work in the US without sponsorship?',
    ].map((q) => normalizeQuestion(q));

    it('all match the work-authorization pattern set', () => {
      const patterns = ['authorized work', 'work authorization'];
      for (const q of phrasings) {
        expect(patterns.some((p) => matchesPattern(q, p))).toBe(true);
      }
    });

    it('all resolve the same country', () => {
      expect(phrasings.every((q) => q.country === 'US')).toBe(true);
    });
  });
});

describe('questionKeyFor', () => {
  it('slugifies short questions readably', () => {
    expect(questionKeyFor('notice period')).toBe('notice-period');
  });

  it('hash-suffixes long questions so truncation cannot collide', () => {
    const long = 'a'.repeat(200);
    const other = `${'a'.repeat(199)}b`;

    expect(questionKeyFor(long).length).toBeLessThanOrEqual(80);
    expect(questionKeyFor(long)).not.toBe(questionKeyFor(other));
  });

  it('handles empty input', () => {
    expect(questionKeyFor('')).toBe('unknown');
  });
});

describe('matchesPattern', () => {
  const q = normalizeQuestion('Are you legally authorized to work in the United States?');

  it('matches a contained pattern', () => {
    expect(matchesPattern(q, 'authorized work')).toBe(true);
  });

  it('rejects a non-matching pattern', () => {
    expect(matchesPattern(q, 'notice period')).toBe(false);
  });

  it('ignores empty patterns', () => {
    expect(matchesPattern(q, '')).toBe(false);
    expect(matchesPattern(q, '   ')).toBe(false);
  });
});
