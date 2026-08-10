import {
  extractSourceFacts,
  extractNumbers,
  enforceExperienceGrounding,
  findFabricatedMetrics,
} from './resume-grounding';

const source = {
  summary: 'Backend engineer with 7 years of experience.',
  skills: ['TypeScript', 'Postgres'],
  experience: [
    {
      title: 'Senior Backend Engineer',
      company: 'Plaid',
      startDate: '2021-03',
      endDate: '2024-08',
      description: 'Led the onboarding rewrite, lifting activation 31%.',
    },
    {
      title: 'Backend Engineer',
      company: 'Monzo',
      startDate: '2018-01',
      endDate: '2021-02',
    },
  ],
};

describe('extractSourceFacts', () => {
  it('collects employers and titles', () => {
    const facts = extractSourceFacts(source);

    expect(facts.companies.has('plaid')).toBe(true);
    expect(facts.companies.has('monzo')).toBe(true);
    expect(facts.titles.has('senior backend engineer')).toBe(true);
  });

  it('collects every number appearing anywhere in the source', () => {
    const facts = extractSourceFacts(source);

    expect(facts.numbers.has('31')).toBe(true);
    expect(facts.numbers.has('7')).toBe(true);
  });

  it('handles an empty source without throwing', () => {
    expect(() => extractSourceFacts({})).not.toThrow();
  });
});

describe('extractNumbers', () => {
  it('finds digit runs including decimals', () => {
    expect(extractNumbers('grew 12.5% across 3 teams')).toEqual(['12.5', '3']);
  });

  it('strips thousands separators so 1,200 matches 1200', () => {
    expect(extractNumbers('served 1,200 users')).toEqual(['1200']);
  });

  it('returns nothing for text with no figures', () => {
    expect(extractNumbers('led the migration')).toEqual([]);
  });
});

describe('enforceExperienceGrounding', () => {
  const facts = extractSourceFacts(source);

  it('keeps entries whose employer and title come from the source', () => {
    const { kept, violations } = enforceExperienceGrounding(
      [{ title: 'Senior Backend Engineer', company: 'Plaid', startDate: '2021-03' }],
      facts,
    );

    expect(kept).toHaveLength(1);
    expect(violations).toHaveLength(0);
  });

  // The load-bearing case: an employer the candidate never worked for cannot be
  // corrected, only removed.
  it('removes an entry naming an employer that is not in the source', () => {
    const { kept, violations } = enforceExperienceGrounding(
      [{ title: 'Senior Backend Engineer', company: 'Stripe' }],
      facts,
    );

    expect(kept).toHaveLength(0);
    expect(violations).toContainEqual({ kind: 'employer', value: 'Stripe', where: 'experience' });
  });

  it('removes an entry with an invented job title', () => {
    const { kept, violations } = enforceExperienceGrounding(
      [{ title: 'VP of Engineering', company: 'Plaid' }],
      facts,
    );

    expect(kept).toHaveLength(0);
    expect(violations.some((v) => v.kind === 'title')).toBe(true);
  });

  it('removes an entry whose dates were shifted', () => {
    const { kept, violations } = enforceExperienceGrounding(
      [{ title: 'Senior Backend Engineer', company: 'Plaid', startDate: '2019-01' }],
      facts,
    );

    expect(kept).toHaveLength(0);
    expect(violations.some((v) => v.kind === 'date')).toBe(true);
  });

  it('is case- and whitespace-insensitive about legitimate entries', () => {
    const { kept } = enforceExperienceGrounding(
      [{ title: '  senior backend ENGINEER ', company: 'plaid' }],
      facts,
    );

    expect(kept).toHaveLength(1);
  });

  it('keeps the good entries and drops only the bad ones', () => {
    const { kept, violations } = enforceExperienceGrounding(
      [
        { title: 'Senior Backend Engineer', company: 'Plaid' },
        { title: 'Staff Engineer', company: 'Netflix' },
        { title: 'Backend Engineer', company: 'Monzo' },
      ],
      facts,
    );

    expect(kept.map((e) => e.company)).toEqual(['Plaid', 'Monzo']);
    expect(violations.length).toBeGreaterThan(0);
  });

  it('handles undefined input', () => {
    expect(enforceExperienceGrounding(undefined, facts).kept).toEqual([]);
  });
});

describe('findFabricatedMetrics', () => {
  const facts = extractSourceFacts(source);

  it('accepts a figure that exists in the source', () => {
    expect(findFabricatedMetrics('Lifted activation 31% at Plaid.', facts)).toEqual([]);
  });

  // The characteristic résumé-generator failure: a plausible, invented number.
  it('flags a figure with no origin in the source', () => {
    const violations = findFabricatedMetrics('Reduced latency by 63%.', facts);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ kind: 'metric', value: '63' });
  });

  it('flags every invented figure, not just the first', () => {
    expect(findFabricatedMetrics('Grew 12% and cut costs 45%.', facts)).toHaveLength(2);
  });

  it('says nothing about prose with no figures', () => {
    expect(findFabricatedMetrics('Led the payments migration.', facts)).toEqual([]);
  });

  it('reports where the violation was found', () => {
    const [v] = findFabricatedMetrics('Improved throughput 88%.', facts, 'experience[0]');
    expect(v.where).toBe('experience[0]');
  });
});
