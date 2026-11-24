import { absentAfterExtraction, groundResumeExtraction } from './resume-extraction';

describe('groundResumeExtraction', () => {
  const source = [
    'Alex Chen',
    'alex@example.com',
    'Engineering Description',
    'Designed distributed systems for billing.',
    'Engineer',
    'Example Co',
    'Toronto',
  ].join('\n');

  it('maps an equivalent heading into summary and drops text that is not in the résumé', () => {
    const extracted = groundResumeExtraction({
      fullName: 'Alex Chen',
      email: 'alex@example.com',
      summary: 'Designed distributed systems for billing. Led a team of 40.',
      experience: [{
        title: 'Engineer',
        company: 'Example Co',
        location: 'Toronto',
        achievements: ['Invented a 40% speedup.'],
      }],
    }, source);

    expect(extracted.summary).toBe('Designed distributed systems for billing.');
    expect(extracted.experience).toEqual([
      expect.objectContaining({ title: 'Engineer', company: 'Example Co', location: 'Toronto' }),
    ]);
    expect(extracted.experience?.[0].achievements).toBeUndefined();
    expect(JSON.stringify(extracted)).not.toMatch(/40%|team of 40/);
    expect(absentAfterExtraction(['summary', 'skills', 'education'], extracted)).toEqual(['skills', 'education']);
  });

  it('does not treat a skill as present because it is part of a longer word', () => {
    const extracted = groundResumeExtraction({
      skills: ['Java', 'TypeScript'],
      summary: 'Led MVP. Invented a market.',
    }, 'TypeScript\nLed MVP.');

    expect(extracted.skills).toEqual(['TypeScript']);
    expect(extracted.summary).toBe('Led MVP.');
  });

  it('normalizes common LLM field aliases, preserves PDF-wrapped text, single-char skills, languages, and dynamic customSections', () => {
    const pdfText = [
      'Alex Chen',
      'Senior Distributed Systems Engineer',
      'alex @ example.com | (416) 555 - 1234 | Toronto , ON | linkedin.com/in/alex-chen | github.com/alexchen',
      'Engineering Description',
      'Built Node .js and distribu-',
      'ted billing systems with 99.9 % uptime.',
      'Technical Stack',
      'C, C++, R, Node.js, TypeScript',
      'Work History',
      'Staff Engineer | Example Co | Jan 2022 - Present',
      '• Reduced p99 latency across payment services',
      'Academic Background',
      'BSc Computer Science, University of Toronto, GPA 3.9, 2018 - 2022',
      'Certifications',
      'AWS Solutions Architect',
      'Projects',
      'LedgerKit — Open-source ledger CLI in TypeScript',
      'Languages',
      'English (Native), French (Conversational)',
      'Publications',
      '• Scaling Idempotent Billing Queues, SystemsConf 2024',
      'Open Source',
      '• Maintainer of pg-queue-kit',
    ].join('\n');

    const extracted = groundResumeExtraction({
      fullName: 'Alex Chen',
      headline: 'Senior Distributed Systems Engineer',
      email: 'alex@example.com',
      phone: '416-555-1234',
      location: 'Toronto, ON',
      linkedin: 'https://linkedin.com/in/alex-chen',
      github: 'https://github.com/alexchen',
      summary: 'Built Node.js and distributed billing systems with 99.9% uptime. Invented a 500% gain.',
      skills: { Languages: ['C', 'C++', 'R', 'Java', 'TypeScript'], Frameworks: ['Node.js'] },
      experience: [{
        role: 'Staff Engineer',
        employer: 'Example Co',
        dates: 'Jan 2022 - Present',
        current: true,
        bullets: ['Reduced p99 latency across payment services', 'Hallucinated 80% savings'],
      }],
      education: [{
        degree: 'BSc Computer Science',
        school: 'University of Toronto',
        gpa: '3.9',
        startDate: '2018',
        endDate: '2022',
      }],
      certifications: ['AWS Solutions Architect', 'Invented Cert'],
      projects: [{
        title: 'LedgerKit',
        summary: 'Open-source ledger CLI in TypeScript',
        technologies: ['TypeScript', 'Rust'],
      }],
      languages: [{ language: 'English', proficiency: 'Native' }, 'French'],
      customSections: {
        Publications: ['Scaling Idempotent Billing Queues, SystemsConf 2024', 'Fake Paper 2025'],
        'Open Source': ['Maintainer of pg-queue-kit'],
      },
    }, pdfText);

    expect(extracted.headline).toBe('Senior Distributed Systems Engineer');
    expect(extracted.email).toBe('alex@example.com');
    expect(extracted.phone).toBe('416-555-1234');
    expect(extracted.location).toBe('Toronto, ON');
    expect(extracted.linkedin).toBe('https://linkedin.com/in/alex-chen');
    expect(extracted.github).toBe('https://github.com/alexchen');
    expect(extracted.summary).toBe('Built Node.js and distributed billing systems with 99.9% uptime.');
    expect(extracted.skills).toEqual(['C', 'C++', 'R', 'TypeScript', 'Node.js']);
    expect(extracted.experience).toEqual([
      expect.objectContaining({
        title: 'Staff Engineer',
        company: 'Example Co',
        startDate: 'Jan 2022',
        endDate: 'Present',
        current: true,
        achievements: ['Reduced p99 latency across payment services'],
      }),
    ]);
    expect(extracted.education).toEqual([
      expect.objectContaining({
        degree: 'BSc Computer Science',
        institution: 'University of Toronto',
        gpa: '3.9',
        startDate: '2018',
        endDate: '2022',
      }),
    ]);
    expect(extracted.certifications).toEqual([{ name: 'AWS Solutions Architect' }]);
    expect(extracted.projects).toEqual([
      expect.objectContaining({
        name: 'LedgerKit',
        description: 'Open-source ledger CLI in TypeScript',
        technologies: ['TypeScript'],
      }),
    ]);
    expect(extracted.languages).toEqual([
      { language: 'English', proficiency: 'Native' },
      { language: 'French' },
    ]);
    expect(extracted.customSections).toEqual([
      { heading: 'Publications', items: ['Scaling Idempotent Billing Queues, SystemsConf 2024'] },
      { heading: 'Open Source', items: ['Maintainer of pg-queue-kit'] },
    ]);
    expect(absentAfterExtraction(['summary', 'languages', 'achievements'], extracted)).toEqual(['achievements']);
  });

  it('does not treat C++ alone as matching C', () => {
    const extracted = groundResumeExtraction({ skills: ['C', 'C++'] }, 'Skills: C++');
    expect(extracted.skills).toEqual(['C++']);
  });
});
