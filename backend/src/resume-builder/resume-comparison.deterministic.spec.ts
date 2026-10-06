import { ResumeComparisonService } from './resume-comparison.service';
import { AtsParseabilityService } from '../ats/ats-parseability.service';
import { AtsMatchService } from '../ats/ats-match.service';
import { ResumeAiContentHeuristicService } from '../employer-pipeline/resume-ai-content-heuristic.service';

describe('deterministic candidate comparison', () => {
  it('scores unchanged documents identically across refreshes without starting paid work', async () => {
    const resume = {
      _id: 'resume-1', creationMethod: 'imported', fullName: 'Jordan Reyes',
      email: 'jordan@example.com', phone: '4165551234',
      summary: 'Results-driven TypeScript engineer.', skills: ['TypeScript'],
      experience: [{ title: 'Engineer', company: 'Acme', achievements: ['Built TypeScript APIs.'] }],
      education: [{ degree: 'BSc', institution: 'Example University' }],
    };
    const ats = new AtsParseabilityService();
    const match = new AtsMatchService();
    const content = new ResumeAiContentHeuristicService();
    const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    const service = new (ResumeComparisonService as any)(
      { findOne: () => ({ exec: async () => resume }), updateOne }, content, {}, {},
      {}, ats, match,
    );
    const input = { jobDescription: 'TypeScript and AWS required.' };
    const first = await service.compare('resume-1', '507f1f77bcf86cd799439011', input);
    const refreshed = await service.compare('resume-1', '507f1f77bcf86cd799439011', { ...input, forceRefresh: true });
    expect(first.ats.score).toBe(ats.check({ structured: resume }).score);
    expect(first.match).toMatchObject(match.match(resume, input.jobDescription));
    expect(first.aiContent).toEqual(content.analyze('Jordan Reyes\njordan@example.com\n4165551234\nResults-driven TypeScript engineer.\nTypeScript\nEngineer\nAcme\nBuilt TypeScript APIs.\nBSc\nExample University'));
    expect([refreshed.ats.score, refreshed.match.coverage, refreshed.aiContent.composite])
      .toEqual([first.ats.score, first.match.coverage, first.aiContent.composite]);
    expect(first.annotations).toEqual(expect.arrayContaining([
      expect.objectContaining({ section: 'skills', message: expect.stringContaining('AWS') }),
    ]));
    const changedJob = await service.compare('resume-1', '507f1f77bcf86cd799439011', { jobDescription: 'TypeScript required.' });
    expect(changedJob.match.coverage).toBe(100);
    expect(changedJob.ats.score).toBe(first.ats.score);
    expect(changedJob.aiContent.composite).toBe(first.aiContent.composite);
    expect(first.review).toEqual({ source: 'deterministic', version: 'comparison-v1' });
    expect(updateOne).toHaveBeenCalledTimes(3);
    expect(updateOne).toHaveBeenNthCalledWith(1,
      { _id: 'resume-1', userId: expect.anything() },
      { $push: { comparisonHistory: { $each: [{
        at: expect.any(Date), atsScore: first.ats.score,
        jobMatchScore: first.match.coverage, contentScore: first.aiContent.composite,
      }], $slice: -500 } } },
    );
  });
});
