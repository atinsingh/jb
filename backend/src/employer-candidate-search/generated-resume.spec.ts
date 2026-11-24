import { generatedResumeFromSession } from './generated-resume';

const mayaFacts = `# Candidate facts

## Identity

- Name: Maya Ellison
- Headline: Full-Stack Software Engineer
- Email: maya@example.com
- Phone: 416-555-0148
- Location: Toronto, ON
- LinkedIn: https://www.linkedin.com/in/maya-ellison

## Experience

### Software Engineer — Northline
- Email: not-an-identity-line@example.com is inside experience and is ignored

## Skills

TypeScript, React, Node.js


## This résumé

- Target role: Senior Full-Stack Engineer
`;

describe('generatedResumeFromSession', () => {
  it('reads identity, skills, and roles from a compiled résumé session', () => {
    const doc = generatedResumeFromSession({
      candidateName: 'Maya Ellison',
      candidateMarkdown: mayaFacts,
      targetRole: 'Senior Full-Stack Engineer',
      jobDescription: 'Senior Full-Stack Engineer at Northwind Labs. Build the platform.',
      jobUrl: 'https://jobs.example.com/open/staff-platform-engineer',
      compiled: true,
    });

    expect(doc).toEqual({
      fullName: 'Maya Ellison',
      email: 'maya@example.com',
      phone: '416-555-0148',
      linkedin: 'https://www.linkedin.com/in/maya-ellison',
      headline: 'Full-Stack Software Engineer',
      skills: ['TypeScript', 'React', 'Node.js'],
      roles: ['Senior Full-Stack Engineer', 'staff platform engineer'],
    });
    expect(JSON.stringify(doc)).not.toContain('Build the platform');
  });

  it('reads bullet skills and a file-name target role', () => {
    const doc = generatedResumeFromSession({
      candidateName: 'Harkit',
      candidateMarkdown: '- Name: Harkit\n- Email: harkit@example.com\n\n## Skills\n\n- Java\n- Spring Boot\n\n## Education\n',
      targetRole: 'HARKIT CHHABRA_SOFTWARE ENGINEER',
      turns: [{ compiled: true }],
    });
    expect(doc?.skills).toEqual(['Java', 'Spring Boot']);
    expect(doc?.roles).toEqual(['Software Engineer']);
    expect(doc?.fullName).toBe('Harkit');
  });

  it('is not a generated résumé until a build compiled, and not after it is archived', () => {
    expect(generatedResumeFromSession({ candidateName: 'Maya Ellison', compiled: false, turns: [] })).toBeNull();
    expect(
      generatedResumeFromSession({ candidateName: 'Maya Ellison', compiled: true, archivedAt: new Date() }),
    ).toBeNull();
  });
});
