import { jobRoleQuery, roleFits, skillFits } from './job-fit';

describe('job fit', () => {
  it('drops a seniority word so a posted title still matches the résumé role', () => {
    expect(jobRoleQuery('Senior Backend Engineer')).toBe('Backend Engineer');
    expect(roleFits('Senior Backend Engineer', 'Backend Engineer')).toBe(true);
    expect(roleFits('Senior Backend Engineer', 'Senior Backend Engineer')).toBe(true);
  });

  it('does not treat a one-word overlap as the same role', () => {
    expect(roleFits('Senior Backend Engineer', 'Engineer')).toBe(false);
    expect(roleFits('Senior Backend Engineer', 'Nurse')).toBe(false);
  });

  it('matches a skill only when the strings are the same', () => {
    expect(skillFits(['TypeScript'], ['typescript'])).toBe(true);
    expect(skillFits(['Nursing'], ['TypeScript'])).toBe(false);
  });
});