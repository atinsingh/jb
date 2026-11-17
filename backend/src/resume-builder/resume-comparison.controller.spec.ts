import { ResumeComparisonController } from './resume-comparison.controller';
import { ResumeComparisonService } from './resume-comparison.service';

describe('ResumeComparisonController', () => {
  it('passes the authenticated user to the imported-resume comparison service', async () => {
    const expected = { resumeId: 'resume-1', annotations: [] };
    const service = { compare: jest.fn().mockResolvedValue(expected) };
    const controller = new ResumeComparisonController(service as unknown as ResumeComparisonService);

    await expect(
      controller.compare(
        'resume-1',
        { jobDescription: 'TypeScript and AWS' },
        { user: { _id: { toString: () => 'user-1' } } },
      ),
    ).resolves.toBe(expected);
    expect(service.compare).toHaveBeenCalledWith('resume-1', 'user-1', {
      jobDescription: 'TypeScript and AWS',
    });
  });

  it('passes the authenticated user and session to the review read', async () => {
    const service = { compare: jest.fn(), reviewComments: jest.fn().mockResolvedValue({ status: 'active' }) };
    const controller = new ResumeComparisonController(service as unknown as ResumeComparisonService);

    await expect(controller.review(
      'resume-1',
      'session-1',
      { user: { _id: { toString: () => 'user-1' } } },
    )).resolves.toEqual({ status: 'active' });
    expect(service.reviewComments).toHaveBeenCalledWith('resume-1', 'user-1', 'session-1');
  });
});
