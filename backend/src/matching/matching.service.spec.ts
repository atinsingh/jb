import { MatchingService } from './matching.service';

const USER_ID = 'user123';
const JOB_ID = 'job123';

describe('MatchingService (llm migration)', () => {
  let service: MatchingService;
  let jobMatchModel: { findOneAndUpdate: jest.Mock };
  let jobModel: { findById: jest.Mock };
  let userModel: { findById: jest.Mock };
  let matchCalculator: { calculateMatch: jest.Mock };
  let coverLetterGenerator: { generateCoverLetter: jest.Mock };
  let jobProfiles: { getActiveProfiles: jest.Mock; getProfile: jest.Mock };

  const user = { _id: USER_ID, email: 'jane@example.com', name: 'Jane' };
  const job = {
    _id: JOB_ID,
    title: 'Engineer',
    companyName: 'Acme',
    requirements: ['ts'],
    description: 'build things',
    skills: ['ts', 'go'],
  };
  const profile = {
    _id: 'p1',
    skills: ['ts'],
    profileName: 'Default',
    experience: [],
    summary: 'dev',
  };

  beforeEach(() => {
    jobMatchModel = {
      findOneAndUpdate: jest.fn().mockImplementation((_q, data) => Promise.resolve(data)),
    };
    jobModel = { findById: jest.fn().mockResolvedValue(job) };
    userModel = { findById: jest.fn().mockResolvedValue(user) };
    matchCalculator = { calculateMatch: jest.fn() };
    coverLetterGenerator = { generateCoverLetter: jest.fn() };
    jobProfiles = {
      getActiveProfiles: jest.fn().mockResolvedValue([profile]),
      getProfile: jest.fn().mockResolvedValue(profile),
    };

    service = new MatchingService(
      jobMatchModel as any,
      jobModel as any,
      userModel as any,
      matchCalculator as any,
      coverLetterGenerator as any,
      jobProfiles as any,
    );
  });

  describe('calculateMatch', () => {
    it('threads userId into MatchCalculatorService and persists the AI result', async () => {
      matchCalculator.calculateMatch.mockResolvedValue({
        matchScore: 90,
        matchedSkills: ['ts'],
        missingSkills: ['go'],
        reasoning: 'strong',
      });

      const match = await service.calculateMatch(USER_ID, JOB_ID);

      expect(matchCalculator.calculateMatch).toHaveBeenCalledWith(
        USER_ID,
        ['ts'],
        'ts',
        'build things',
      );
      expect(match.matchScore).toBe(90);
    });

    it('falls back to simpleMatch when the llm service throws', async () => {
      matchCalculator.calculateMatch.mockRejectedValue(new Error('llm down'));

      const match = await service.calculateMatch(USER_ID, JOB_ID);

      // 1 of 2 job skills matched → 50
      expect(match.matchScore).toBe(50);
      expect(match.reasoning).toContain('Simple skill matching');
    });
  });

  describe('generateCoverLetter', () => {
    it('maps the structured finalLetter to a plain string', async () => {
      coverLetterGenerator.generateCoverLetter.mockResolvedValue({
        sections: {},
        finalLetter: 'Dear Acme, hire me.',
      });

      const result = await service.generateCoverLetter(USER_ID, JOB_ID);

      expect(coverLetterGenerator.generateCoverLetter).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ name: 'Jane', email: 'jane@example.com' }),
        expect.objectContaining({ title: 'Engineer', companyName: 'Acme' }),
      );
      expect(result).toBe('Dear Acme, hire me.');
    });
  });
});
