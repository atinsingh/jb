import { JobMatchingService } from './job-matching.service';

const USER_ID = 'user123';

describe('JobMatchingService (llm migration)', () => {
  let service: JobMatchingService;
  let matchCalculator: { calculateMatch: jest.Mock };
  let coverLetterGenerator: { generateCoverLetter: jest.Mock };

  beforeEach(() => {
    matchCalculator = { calculateMatch: jest.fn() };
    coverLetterGenerator = { generateCoverLetter: jest.fn() };
    service = new JobMatchingService(
      matchCalculator as any,
      coverLetterGenerator as any,
    );
  });

  describe('calculateMatch', () => {
    it('threads userId and returns the MatchCalculatorService result shape', async () => {
      matchCalculator.calculateMatch.mockResolvedValue({
        matchScore: 82,
        matchedSkills: ['ts'],
        missingSkills: ['go'],
        reasoning: 'good fit',
      });

      const result = await service.calculateMatch(
        USER_ID,
        { skills: ['ts'] },
        { requirements: ['ts', 'go'], description: 'build' },
      );

      expect(matchCalculator.calculateMatch).toHaveBeenCalledWith(
        USER_ID,
        ['ts'],
        'ts, go',
        'build',
      );
      expect(result.matchScore).toBe(82);
    });

    it('falls back to deterministic simpleMatch when the llm service throws', async () => {
      matchCalculator.calculateMatch.mockRejectedValue(new Error('llm down'));

      const result = await service.calculateMatch(
        USER_ID,
        { skills: ['ts'] },
        { skills: ['ts', 'go'] },
      );

      // 1 of 2 job skills matched → 50
      expect(result.matchScore).toBe(50);
      expect(result.matchedSkills).toEqual(['ts']);
      expect(result.missingSkills).toEqual(['go']);
    });
  });

  describe('generateCoverLetter', () => {
    it('maps the structured finalLetter back to a plain string', async () => {
      coverLetterGenerator.generateCoverLetter.mockResolvedValue({
        sections: {},
        finalLetter: 'Dear Acme, ...',
      });

      const result = await service.generateCoverLetter(
        USER_ID,
        { name: 'Jane', skills: ['ts'], summary: 'dev' },
        { title: 'Engineer', companyName: 'Acme', description: 'build' },
      );

      expect(coverLetterGenerator.generateCoverLetter).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ name: 'Jane', email: '' }),
        expect.objectContaining({ title: 'Engineer', companyName: 'Acme' }),
      );
      expect(result).toBe('Dear Acme, ...');
    });

    it('rethrows a clean error when generation fails', async () => {
      coverLetterGenerator.generateCoverLetter.mockRejectedValue(
        new Error('boom'),
      );

      await expect(
        service.generateCoverLetter(USER_ID, {}, {}),
      ).rejects.toThrow('Failed to generate cover letter');
    });
  });
});
