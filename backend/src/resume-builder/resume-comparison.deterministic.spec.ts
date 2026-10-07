import { ResumeComparisonService } from './resume-comparison.service';
import { AtsParseabilityService } from '../ats/ats-parseability.service';
import { AtsMatchService } from '../ats/ats-match.service';
import { ResumeAiContentHeuristicService } from '../employer-pipeline/resume-ai-content-heuristic.service';

describe('deterministic candidate comparison', () => {
  it('retains detailed metered review while keeping all scores deterministic across refreshes', async () => {
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
    const review = {
      source: 'agent-session', sessionId: 'review-1', harness: 'opencode', modelAlias: 'automatic',
      ats: { score: 1, explanation: 'The experience needs more specific outcomes.' },
      match: { coverage: 2, explanation: 'TypeScript is evidenced; AWS needs supporting experience.' },
      annotations: [{ id: 'detail', section: 'experience', severity: 'warning',
        quote: 'Built TypeScript APIs.', message: 'The API work lacks an outcome.', fix: 'What did these APIs help users accomplish?' }],
    };
    const agent = { review: jest.fn().mockResolvedValue(review) };
    const service = new (ResumeComparisonService as any)(
      { findOne: () => ({ exec: async () => resume }), updateOne }, content, {}, {},
      {}, ats, match, agent,
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
    expect(first.review).toMatchObject({ source: 'agent-session', sessionId: 'review-1' });
    expect(first.ats.explanation).toContain(`${first.ats.score}%`);
    expect(first.match.explanation).toContain(`${first.match.coverage}%`);
    expect(first.annotations).toEqual(expect.arrayContaining([
      expect.objectContaining({ quote: 'Built TypeScript APIs.', message: review.annotations[0].message, color: 'amber' }),
    ]));
    expect(agent.review).toHaveBeenNthCalledWith(1, expect.objectContaining({
      userId: '507f1f77bcf86cd799439011', resumeId: 'resume-1', resumeText: expect.stringContaining('Built TypeScript APIs.'),
      jobDescription: input.jobDescription,
    }), { forceRefresh: false });
    expect(agent.review).toHaveBeenNthCalledWith(2, expect.anything(), { forceRefresh: true });
    expect(updateOne).toHaveBeenCalledTimes(3);
    expect(updateOne).toHaveBeenNthCalledWith(1,
      { _id: 'resume-1', userId: expect.anything() },
      { $push: { comparisonHistory: { $each: [{
        at: expect.any(Date), atsScore: first.ats.score,
        jobMatchScore: first.match.coverage, contentScore: first.aiContent.composite,
      }], $slice: -500 } } },
    );
  });

  it('explains the displayed scores even when a cached agent explanation quotes another assessment', async () => {
    const text = [
      'Jordan Reyes', 'jordan@example.com', '4165551234', 'Summary',
      'TypeScript engineer building customer services.', 'Experience',
      'Built TypeScript APIs.', 'Skills', 'TypeScript', 'Education',
      'BSc, Example University', ...Array(30).fill('Delivered reliable services with documented customer outcomes.'),
    ].join('\n');
    const resume = {
      creationMethod: 'imported', source: { storageKey: 'resumes/compare/507f1f77bcf86cd799439011/source.pdf', originalFilename: 'source.pdf' },
      save: jest.fn(),
    };
    const agent = { review: jest.fn().mockResolvedValue({
      source: 'agent-session', sessionId: 'cached-review',
      ats: { score: 36, explanation: 'ATS semantic score is 35.6/100 — a weak match.' },
      match: { coverage: 36, explanation: 'Job match is 35.6%.' },
      annotations: [{ id: 'detail', section: 'experience', severity: 'warning',
        quote: 'Built TypeScript APIs.', message: 'Explain the customer outcome.', fix: 'What did these APIs help customers accomplish?' }],
    }) };
    const service = new (ResumeComparisonService as any)(
      { findOne: () => ({ exec: async () => resume }), updateOne: jest.fn() },
      new ResumeAiContentHeuristicService(), {},
      { getBuffer: async () => Buffer.from('pdf') },
      { extractText: async () => text, heuristicParse: () => ({}) },
      new AtsParseabilityService(), new AtsMatchService(), agent,
    );

    const result = await service.compare('resume-1', '507f1f77bcf86cd799439011', { jobDescription: 'TypeScript and AWS required.' });

    expect(result.ats.score).toBe(100);
    expect(result.ats.explanation).toContain('100%');
    expect(result.ats.explanation).toContain('document compatibility');
    expect(result.match.coverage).toBe(50);
    expect(result.match.explanation).toContain('50%');
    expect(result.match.explanation).toContain('1 of 2');
    expect(result.match.explanation).toContain('AWS');
    expect(`${result.ats.explanation} ${result.match.explanation}`).not.toContain('35.6');
    expect(result.annotations).toEqual(expect.arrayContaining([
      expect.objectContaining({ quote: 'Built TypeScript APIs.', message: 'Explain the customer outcome.' }),
    ]));
    expect(result.review.sessionId).toBe('cached-review');
  });
});
