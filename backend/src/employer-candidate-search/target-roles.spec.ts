import { cleanRole, isSearchableResume, rolesForResume, titleFromJobText } from './target-roles';

describe('titleFromJobText', () => {
  it('reads the title from the first sentence of a pasted job description', () => {
    expect(
      titleFromJobText('Senior Full-Stack Engineer at Northwind Labs, Toronto (hybrid). Build the customer platform.'),
    ).toBe('Senior Full-Stack Engineer');
    expect(titleFromJobText('Backend Engineer at Example Systems. Build TypeScript services.')).toBe('Backend Engineer');
    expect(titleFromJobText('Full Stack Software Engineer. Build and maintain React apps.')).toBe(
      'Full Stack Software Engineer',
    );
  });

  it('does not turn job-board chrome or a hiring sentence into a role', () => {
    expect(titleFromJobText('Select how often (in days) to receive an alert:\n\nCreate Alert\n\nApply now »')).toBeUndefined();
    expect(
      titleFromJobText("Full job description\nWe're looking for an experienced {Job Title} to help train AI models."),
    ).toBeUndefined();
    expect(titleFromJobText('We are hiring a Backend Engineer.')).toBeUndefined();
  });
});

describe('cleanRole', () => {
  it('keeps the role part of a file-name style target and title-cases shouting', () => {
    expect(cleanRole('HARKIT CHHABRA_SOFTWARE ENGINEER')).toBe('Software Engineer');
    expect(cleanRole('Cloud Engineer')).toBe('Cloud Engineer');
    expect(cleanRole('Mechanical Engineer - AI Trainer')).toBe('Mechanical Engineer - AI Trainer');
  });

  it('drops a résumé file name that names no role', () => {
    expect(cleanRole('Himaswin_Polaboyena_Resume (9)')).toBeUndefined();
    expect(cleanRole('Maya Ellison CV.pdf')).toBeUndefined();
  });
});

describe('isSearchableResume', () => {
  it('includes generated résumés and a completed compare', () => {
    expect(isSearchableResume({ creationMethod: 'job_tailored' }, false)).toBe(true);
    expect(isSearchableResume({ creationMethod: 'ai_rewrite' }, false)).toBe(true);
    expect(isSearchableResume({ creationMethod: 'generated' }, false)).toBe(true);
    expect(isSearchableResume({ source: 'generated' }, false)).toBe(true);
    expect(isSearchableResume({ creationMethod: 'imported' }, true)).toBe(true);
  });

  it('excludes archived résumés, uncompared imports, manuals, and duplicates', () => {
    expect(isSearchableResume({ creationMethod: 'job_tailored', status: 'archived' }, false)).toBe(false);
    expect(isSearchableResume({ creationMethod: 'imported' }, false)).toBe(false);
    expect(isSearchableResume({ creationMethod: 'manual' }, false)).toBe(false);
    expect(isSearchableResume({ creationMethod: 'duplicate' }, true)).toBe(false);
  });
});

describe('rolesForResume', () => {
  it('unions the generated target role and the compare title, collapsing duplicates', () => {
    expect(
      rolesForResume({
        targetRole: 'Senior Backend Engineer',
        headline: 'senior   backend engineer',
      }),
    ).toEqual(['Senior Backend Engineer']);
  });

  it('reads a short compare title and drops the rest of the job text', () => {
    const roles = rolesForResume(
      { creationMethod: 'imported' },
      { jobText: 'Role: Platform Engineer\nWe need someone who has shipped payments for years.' },
    );
    expect(roles).toEqual(['Platform Engineer']);
    expect(roles.join(' ')).not.toContain('payments');
  });

  it('reads the compared job from the résumé source, not only the review job text', () => {
    const roles = rolesForResume({
      creationMethod: 'imported',
      source: { jobDescription: 'Senior Full-Stack Engineer at Northwind Labs, Toronto (hybrid). Build things.' },
    });
    expect(roles).toEqual(['Senior Full-Stack Engineer']);
  });

  it('uses a short first line when the job text has no labelled title', () => {
    expect(rolesForResume({}, { jobText: 'Staff Engineer\n\nA long description follows.' })).toEqual([
      'Staff Engineer',
    ]);
  });

  it('does not turn a sentence headline or a raw paragraph into a role', () => {
    expect(
      rolesForResume(
        { headline: 'Backend engineer who has shipped payments infrastructure for years.' },
        { jobText: 'We are hiring a person who has shipped payments infrastructure across several teams.' },
      ),
    ).toEqual([]);
  });

  it('derives a title from the job url and skips id segments', () => {
    expect(
      rolesForResume({ source: { jobUrl: 'https://jobs.example.com/open/senior-backend-engineer' } }),
    ).toEqual(['senior backend engineer']);
    expect(rolesForResume({ source: { jobUrl: 'https://jobs.example.com/jobs/12345' } })).toEqual([]);
  });

  it('adds a harness role only when that session matches this résumé', () => {
    const resume = { name: 'Backend résumé', targetRole: 'Senior Backend Engineer' };
    expect(
      rolesForResume(resume, {
        sessions: [
          {
            targetRole: 'Senior Backend Engineer',
            jobUrl: 'https://jobs.example.com/staff-platform-engineer',
          },
          { targetRole: 'Nurse', name: 'Someone else' },
        ],
      }),
    ).toEqual(['Senior Backend Engineer', 'staff platform engineer']);
  });
});
