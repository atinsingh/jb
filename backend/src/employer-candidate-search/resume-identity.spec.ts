import { resumeMatchesAccount } from './resume-identity';

const ada = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+1 (555) 010-1000',
  linkedin: 'https://www.linkedin.com/in/Ada-Lovelace/',
};

describe('resumeMatchesAccount', () => {
  it('includes a résumé whose name matches the account', () => {
    expect(resumeMatchesAccount(ada, { fullName: 'ada  lovelace' })).toBe(true);
  });

  it('includes a résumé that omits a middle name and excludes a different person who only shares a first name', () => {
    expect(resumeMatchesAccount(
      { name: 'Harkit Singh Chhabra', email: 'harkit@example.com' },
      { fullName: 'Harkit Chhabra', email: 'harkit@example.com' },
    )).toBe(true);
    expect(resumeMatchesAccount(
      { name: 'Harkit', email: 'harkit@example.com' },
      { fullName: 'Kaouthar Wadjinny', email: 'kaouthar@example.com' },
    )).toBe(false);
  });

  it('treats a lone first name as neither a match nor a contradiction, so a social decides', () => {
    expect(resumeMatchesAccount(
      { name: 'Harkit', email: 'harkit@example.com' },
      { fullName: 'Harkit Chhabra', email: 'HARKIT@example.com' },
    )).toBe(true);
    expect(resumeMatchesAccount(
      { name: 'Harkit Singh Chhabra', email: 'harkit@example.com' },
      { fullName: 'Harkit', email: 'harkit@example.com' },
    )).toBe(true);
    expect(resumeMatchesAccount({ name: 'Harkit' }, { fullName: 'Harkit Chhabra' })).toBe(false);
    expect(resumeMatchesAccount({ name: 'Harkit' }, { fullName: ' harkit ' })).toBe(true);
    expect(resumeMatchesAccount(
      { name: 'Harkit', email: 'h@example.com', linkedin: 'linkedin.com/in/harkit', phone: '4377999104' },
      { fullName: 'Harkit', email: 'h@example.com', linkedin: 'https://www.linkedin.com/in/harkit', phone: '+91 77100 55161' },
    )).toBe(true);
    expect(resumeMatchesAccount(
      { name: 'Harkit', email: 'harkit@example.com' },
      { fullName: 'Harkit Chhabra', email: 'someone@else.com' },
    )).toBe(false);
    expect(resumeMatchesAccount(
      { name: 'Harkit', email: 'harkit@example.com' },
      { fullName: 'Basab Datta', email: 'harkit@example.com' },
    )).toBe(false);
  });

  it('includes a résumé that shares an email, phone, or LinkedIn slug when the name is absent', () => {
    expect(resumeMatchesAccount(ada, { email: 'Ada@Example.com' })).toBe(true);
    expect(resumeMatchesAccount({ phone: '5550101000' }, { phone: '(555) 010-1000' })).toBe(true);
    expect(
      resumeMatchesAccount(ada, { linkedin: 'linkedin.com/in/ada-lovelace' }),
    ).toBe(true);
  });

  it('excludes a résumé written for someone else', () => {
    expect(
      resumeMatchesAccount(ada, {
        fullName: 'Bob Other',
        email: 'bob@elsewhere.com',
        linkedin: 'https://www.linkedin.com/in/bob-other',
      }),
    ).toBe(false);
  });

  it('excludes a name match that contradicts email, phone, or LinkedIn', () => {
    expect(resumeMatchesAccount(ada, { fullName: 'Ada Lovelace', email: 'other@example.com' })).toBe(false);
    expect(resumeMatchesAccount(ada, { fullName: 'Ada Lovelace', phone: '5559990000' })).toBe(false);
    expect(
      resumeMatchesAccount(ada, {
        fullName: 'Ada Lovelace',
        linkedin: 'https://www.linkedin.com/in/someone-else',
      }),
    ).toBe(false);
  });

  it('ignores a stale phone only when name, email, and LinkedIn all match', () => {
    const stale = { fullName: 'Ada Lovelace', email: 'ada@example.com', linkedin: 'linkedin.com/in/ada-lovelace', phone: '+91 77100 55161' };
    expect(resumeMatchesAccount(ada, stale)).toBe(true);
    expect(resumeMatchesAccount(ada, { ...stale, linkedin: undefined })).toBe(false);
    expect(resumeMatchesAccount(ada, { ...stale, email: undefined })).toBe(false);
    expect(resumeMatchesAccount({ ...ada, name: 'Ada' }, { ...stale, fullName: 'Ada Byron' })).toBe(false);
  });

  it('excludes a résumé with no positive name or social match', () => {
    expect(resumeMatchesAccount(ada, {})).toBe(false);
    expect(resumeMatchesAccount(ada, { headline: 'Engineer' } as any)).toBe(false);
  });

  it('does not let github or website confirm identity or override a contradiction', () => {
    expect(
      resumeMatchesAccount(ada, { github: 'ada', website: 'https://ada.example' }),
    ).toBe(false);
    expect(
      resumeMatchesAccount(ada, {
        fullName: 'Ada Lovelace',
        email: 'other@example.com',
        github: 'ada-lovelace',
      }),
    ).toBe(false);
  });
});
