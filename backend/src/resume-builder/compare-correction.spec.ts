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
  });
});
