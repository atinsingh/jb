import { correctionInstruction, importedResumeFacts } from './compare-correction';

describe('compare correction', () => {
  it('puts the uploaded résumé into sections the generator is allowed to treat as facts', () => {
    const facts = importedResumeFacts({
      fullName: 'Jordan Reyes',
      summary: 'Built payment APIs.',
      experience: [{ title: 'Engineer', company: 'Acme', achievements: ['Shipped billing.'] }],
      skills: ['TypeScript'],
    });

    expect(facts).toContain('## Experience');
    expect(facts).toContain('Acme');
    expect(facts).toContain('Summary: Built payment APIs.');
    expect(facts).toContain('## Skills');
    expect(facts).not.toContain('profile above');
  });

  it('includes headline, links, languages, project tech, education details, and dynamic customSections in facts', () => {
    const facts = importedResumeFacts({
      fullName: 'Alex Chen',
      headline: 'Staff Systems Engineer',
      github: 'https://github.com/alexchen',
      website: 'https://alexchen.dev',
      education: [{ degree: 'BSc CS', institution: 'UofT', location: 'Toronto', startDate: '2018', endDate: '2022', gpa: '3.9' }],
      projects: [{ name: 'LedgerKit', description: 'Billing CLI', technologies: ['TypeScript', 'PostgreSQL'], url: 'https://github.com/alexchen/ledgerkit' }],
      languages: [{ language: 'English', proficiency: 'Native' }],
      customSections: [{ heading: 'Publications', items: ['Scaling Billing Queues, 2024'] }],
    } as any);

    expect(facts).toContain('- Headline: Staff Systems Engineer');
    expect(facts).toContain('- GitHub: https://github.com/alexchen');
    expect(facts).toContain('- Website: https://alexchen.dev');
    expect(facts).toContain('GPA 3.9');
    expect(facts).toContain('TypeScript, PostgreSQL');
    expect(facts).toContain('## Languages');
    expect(facts).toContain('English (Native)');
    expect(facts).toContain('## Publications');
    expect(facts).toContain('Scaling Billing Queues, 2024');
  });

  it('asks for the reviewed fixes without permission to invent supporting facts', () => {
    const instruction = correctionInstruction([
      { quote: 'Shipped billing.', message: 'Vague', fix: 'Name the billing system.' },
      { message: 'Skip me' },
    ]);

    expect(instruction).toContain('Name the billing system.');
    expect(instruction).toContain('Shipped billing.');
    expect(instruction).toContain('Do not invent');
    expect(instruction).not.toContain('Skip me');
    expect(instruction).not.toContain('profile');
  });
});
