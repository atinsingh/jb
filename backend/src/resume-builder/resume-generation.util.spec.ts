import {
  normalizeFacts,
  hasUsableFacts,
  extractNumbers,
  extractOrgMentions,
  groundBullets,
  groundSkills,
  groundSummary,
  computeCoverage,
  extractRequirementPhrases,
  parseModelJson,
  CandidateFactsExperience,
  CandidateFacts,
} from './resume-generation.util';

describe('normalizeFacts / hasUsableFacts', () => {
  it('normalizes a résumé-shaped source', () => {
    const facts = normalizeFacts({
      fullName: 'Jane Doe',
      summary: 'Backend engineer.',
      skills: ['TypeScript', 'Node.js'],
      experience: [
        {
          company: 'Acme Corp',
          title: 'Senior Engineer',
          startDate: '2020-01',
          endDate: '2023-06',
          achievements: ['Shipped the checkout rewrite'],
        },
      ],
      education: [{ degree: 'BSc Computer Science', institution: 'State University' }],
    });

    expect(facts.fullName).toBe('Jane Doe');
    expect(facts.skills).toEqual(['TypeScript', 'Node.js']);
    expect(facts.experience).toHaveLength(1);
    expect(facts.experience[0].company).toBe('Acme Corp');
    expect(hasUsableFacts(facts)).toBe(true);
  });

  it('treats a null/undefined source as empty facts', () => {
    expect(hasUsableFacts(normalizeFacts(null))).toBe(false);
    expect(hasUsableFacts(normalizeFacts(undefined))).toBe(false);
  });

  it('is unusable when experience, skills and summary are all empty (AC8 precondition)', () => {
    const facts = normalizeFacts({ experience: [], skills: [], summary: '' });
    expect(hasUsableFacts(facts)).toBe(false);
  });

  it('falls back to profileSummary/name when summary/fullName are absent (User profile shape)', () => {
    const facts = normalizeFacts({ name: 'Jane', profileSummary: 'A profile summary.' });
    expect(facts.fullName).toBe('Jane');
    expect(facts.summary).toBe('A profile summary.');
  });
});

describe('extractNumbers', () => {
  it('extracts percentages as a single token', () => {
    expect(extractNumbers('increased throughput by 40%')).toEqual(['40%']);
  });

  it('extracts multipliers as a single token', () => {
    expect(extractNumbers('grew the team 3.5x')).toEqual(['3.5x']);
  });

  it('extracts plain counts and dollar amounts, normalising commas', () => {
    expect(extractNumbers('led a team of 5 and saved $40,000')).toEqual(['5', '$40000']);
  });

  it('returns an empty array for text with no digits', () => {
    expect(extractNumbers('Led the migration to a service-oriented architecture.')).toEqual([]);
  });

  it('handles null/undefined safely', () => {
    expect(extractNumbers(null)).toEqual([]);
    expect(extractNumbers(undefined)).toEqual([]);
  });
});

describe('extractOrgMentions', () => {
  it('matches an organisation-like phrase with a legal suffix', () => {
    expect(extractOrgMentions('Partnered with Definitely Fake Corp on launch')).toEqual([
      'Definitely Fake Corp',
    ]);
  });

  it('does not match ordinary prose with no legal-suffix phrase', () => {
    expect(extractOrgMentions('Led the checkout migration to Kubernetes')).toEqual([]);
  });
});

describe('groundBullets (AC2 / AC3 core guard)', () => {
  const source: CandidateFactsExperience = {
    company: 'Acme Corp',
    title: 'Senior Engineer',
    startDate: '2020-01',
    endDate: '2023-06',
    achievements: ['Migrated the checkout service to Kubernetes', 'Mentored two junior engineers'],
  };
  const knownOrgs = new Set(['acme corp']);

  it('keeps a model bullet whose numbers are already grounded in source text', () => {
    const grounded: CandidateFactsExperience = {
      ...source,
      achievements: ['Cut deploy time by 40% via the Kubernetes migration'],
    };
    const result = groundBullets(['Cut deploy time by 40% via the Kubernetes migration'], grounded, knownOrgs);
    expect(result).toEqual(['Cut deploy time by 40% via the Kubernetes migration']);
  });

  it('reverts a bullet that introduces a number not present anywhere in source (AC3)', () => {
    // Source has zero digits anywhere.
    const result = groundBullets(['Increased throughput by 42% after the migration'], source, knownOrgs);
    // The invented "42%" must not survive; the original achievement (no
    // digits) is substituted in its place.
    expect(result[0]).not.toMatch(/42%/);
    expect(result).toEqual([source.achievements[0]]);
  });

  it('reverts a bullet that mentions an organisation outside the candidate\'s own employers (AC2)', () => {
    const result = groundBullets(
      ['Partnered directly with Definitely Fake Corp to ship the redesign'],
      source,
      knownOrgs,
    );
    expect(result.join(' ')).not.toContain('Definitely Fake Corp');
    expect(result).toEqual([source.achievements[0]]);
  });

  it('falls back to the original achievements when the model returns nothing usable', () => {
    expect(groundBullets(undefined, source, knownOrgs)).toEqual(source.achievements);
    expect(groundBullets([], source, knownOrgs)).toEqual(source.achievements);
    expect(groundBullets('not an array', source, knownOrgs)).toEqual(source.achievements);
  });

  it('never returns an empty array when the source has real achievements', () => {
    // Every model bullet is bad (fabricated org) and there happen to be
    // fewer fallback bullets than model bullets.
    const result = groundBullets(
      ['Worked at Definitely Fake Corp', 'Also worked at Another Fake Inc', 'And also Yet More LLC'],
      source,
      knownOrgs,
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result.join(' ')).not.toMatch(/Fake|LLC/);
  });

  it('does not flag a bullet that legitimately repeats the role\'s own start/end year', () => {
    const grounded: CandidateFactsExperience = {
      ...source,
      achievements: ['Joined in 2020 to lead platform migration'],
    };
    const result = groundBullets(['In 2020, led the platform migration end to end'], grounded, knownOrgs);
    expect(result).toEqual(['In 2020, led the platform migration end to end']);
  });
});

describe('groundSkills', () => {
  const sourceSkills = ['TypeScript', 'Node.js', 'PostgreSQL'];

  it('keeps only skills that match the source list, case-insensitively', () => {
    const result = groundSkills(['typescript', 'Node.js', 'Kubernetes'], sourceSkills);
    expect(result).toEqual(['TypeScript', 'Node.js']);
  });

  it('never introduces a skill absent from source (no fabricated qualification)', () => {
    const result = groundSkills(['Quantum Computing'], sourceSkills);
    expect(result).not.toContain('Quantum Computing');
  });

  it('falls back to the full source list when the model output is empty/unusable', () => {
    expect(groundSkills([], sourceSkills)).toEqual(sourceSkills);
    expect(groundSkills(undefined, sourceSkills)).toEqual(sourceSkills);
    expect(groundSkills(['NothingThatMatches'], sourceSkills)).toEqual(sourceSkills);
  });
});

describe('groundSummary', () => {
  const facts: CandidateFacts = {
    summary: 'Backend engineer focused on distributed systems.',
    skills: ['TypeScript', 'Node.js'],
    experience: [
      {
        company: 'Acme Corp',
        title: 'Senior Engineer',
        startDate: '2020-01',
        endDate: '2023-06',
        achievements: ['Migrated the checkout service to Kubernetes'],
      },
    ],
    education: [],
  };
  const knownOrgs = new Set(['acme corp']);

  it('keeps a grounded model summary', () => {
    const result = groundSummary('Senior engineer with deep Kubernetes migration experience.', facts, knownOrgs);
    expect(result).toBe('Senior engineer with deep Kubernetes migration experience.');
  });

  it('reverts to the candidate\'s existing summary when the model invents a metric', () => {
    const result = groundSummary('Engineer who improved performance by 75%.', facts, knownOrgs);
    expect(result).toBe(facts.summary);
  });

  it('reverts to the candidate\'s existing summary when the model invents an employer', () => {
    const result = groundSummary('Engineer previously at Definitely Fake Corp.', facts, knownOrgs);
    expect(result).toBe(facts.summary);
    expect(result).not.toContain('Definitely Fake Corp');
  });

  it('synthesizes a plain fact-only sentence when there is no existing summary at all', () => {
    const noSummaryFacts: CandidateFacts = { ...facts, summary: undefined };
    const result = groundSummary('Fabricated claim of 99% success.', noSummaryFacts, knownOrgs);
    expect(result).not.toMatch(/\d/);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('computeCoverage (AC4)', () => {
  const facts: CandidateFacts = {
    summary: 'Backend engineer.',
    skills: ['React', 'Node.js'],
    experience: [
      {
        company: 'Acme Corp',
        title: 'Senior Engineer',
        startDate: '2020-01',
        endDate: '2023-06',
        description: 'Deployed services on AWS.',
        achievements: [],
      },
    ],
    education: [],
  };

  it('reports matched vs. missing requirements honestly against real facts', () => {
    const result = computeCoverage(['React', 'Node.js', 'AWS', 'Kubernetes', 'GraphQL'], facts);
    expect(result.matched.sort()).toEqual(['AWS', 'Node.js', 'React'].sort());
    expect(result.missing.sort()).toEqual(['GraphQL', 'Kubernetes'].sort());
    expect(result.percentage).toBe(60);
  });

  it('reports 0% when the candidate evidences none of the requirements', () => {
    const result = computeCoverage(['Rust', 'Elixir'], facts);
    expect(result.matched).toEqual([]);
    expect(result.missing).toEqual(['Rust', 'Elixir']);
    expect(result.percentage).toBe(0);
  });

  it('returns 0% with empty lists when there are no requirements to check', () => {
    expect(computeCoverage([], facts)).toEqual({ percentage: 0, matched: [], missing: [] });
  });
});

describe('extractRequirementPhrases (deterministic fallback)', () => {
  it('extracts bullet-list requirement lines from a job description', () => {
    const jd = `We are looking for:\n- React\n- Node.js\n- AWS\n- Kubernetes\n- GraphQL\n`;
    const result = extractRequirementPhrases(jd);
    expect(result).toEqual(['React', 'Node.js', 'AWS', 'Kubernetes', 'GraphQL']);
  });

  it('returns an empty array for an empty/missing job description', () => {
    expect(extractRequirementPhrases('')).toEqual([]);
    expect(extractRequirementPhrases(undefined)).toEqual([]);
  });

  it('caps the number of extracted phrases at `max`', () => {
    const jd = Array.from({ length: 20 }, (_, i) => `- Requirement number ${i}`).join('\n');
    expect(extractRequirementPhrases(jd, 8)).toHaveLength(8);
  });
});

describe('parseModelJson', () => {
  it('parses plain JSON', () => {
    expect(parseModelJson('{"summary":"hi"}')).toEqual({ summary: 'hi' });
  });

  it('parses JSON wrapped in a ```json fenced block', () => {
    const content = '```json\n{"summary":"hi"}\n```';
    expect(parseModelJson(content)).toEqual({ summary: 'hi' });
  });

  it('returns {} rather than throwing on unparseable content', () => {
    expect(parseModelJson('not json at all')).toEqual({});
    expect(parseModelJson('')).toEqual({});
    expect(parseModelJson(null)).toEqual({});
  });
});
