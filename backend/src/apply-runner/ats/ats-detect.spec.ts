import { detectAtsType, resolveApplyUrl } from './ats-detect';

describe('detectAtsType', () => {
  it('detects greenhouse', () => {
    expect(detectAtsType('https://boards.greenhouse.io/acme/jobs/123')).toBe('greenhouse');
    expect(detectAtsType('https://job-boards.greenhouse.io/acme/jobs/9')).toBe('greenhouse');
  });

  it('detects lever', () => {
    expect(detectAtsType('https://jobs.lever.co/acme/abc-def')).toBe('lever');
  });

  it('detects workday (myworkdayjobs and workday hosts)', () => {
    expect(
      detectAtsType('https://acme.wd1.myworkdayjobs.com/en-US/careers/job/123'),
    ).toBe('workday');
    expect(detectAtsType('https://acme.workday.com/careers/job/1')).toBe('workday');
  });

  it('returns unknown for other hosts', () => {
    expect(detectAtsType('https://careers.acme.com/apply/1')).toBe('unknown');
    expect(detectAtsType('https://www.linkedin.com/jobs/view/1')).toBe('unknown');
  });

  it('returns unknown for empty / malformed input without throwing', () => {
    expect(detectAtsType('')).toBe('unknown');
    expect(detectAtsType(null)).toBe('unknown');
    expect(detectAtsType(undefined)).toBe('unknown');
    expect(detectAtsType('not a url')).toBe('unknown');
  });

  it('still matches when given a bare hostname substring (non-absolute URL)', () => {
    expect(detectAtsType('boards.greenhouse.io/acme')).toBe('greenhouse');
  });
});

describe('resolveApplyUrl', () => {
  it('prefers originalApplyUrl above all', () => {
    expect(
      resolveApplyUrl({
        originalApplyUrl: 'https://a.greenhouse.io/apply',
        externalUrl: 'https://b',
        sourceUrl: 'https://c',
        canonicalUrl: 'https://d',
      }),
    ).toBe('https://a.greenhouse.io/apply');
  });

  it('falls through the precedence chain: externalUrl -> sourceUrl -> canonicalUrl', () => {
    expect(resolveApplyUrl({ externalUrl: 'https://b', sourceUrl: 'https://c' })).toBe(
      'https://b',
    );
    expect(resolveApplyUrl({ sourceUrl: 'https://c', canonicalUrl: 'https://d' })).toBe(
      'https://c',
    );
    expect(resolveApplyUrl({ canonicalUrl: 'https://d' })).toBe('https://d');
  });

  it('skips empty/whitespace values and trims the result', () => {
    expect(
      resolveApplyUrl({ originalApplyUrl: '   ', externalUrl: '  https://b  ' }),
    ).toBe('https://b');
  });

  it('returns null when the job has no apply url', () => {
    expect(resolveApplyUrl({})).toBeNull();
    expect(resolveApplyUrl(null)).toBeNull();
    expect(resolveApplyUrl(undefined)).toBeNull();
  });
});
