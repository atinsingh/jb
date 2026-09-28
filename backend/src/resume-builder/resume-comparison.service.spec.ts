import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ResumeComparisonService } from './resume-comparison.service';

describe('ResumeComparisonService', () => {
  const userId = '507f1f77bcf86cd799439011';
  const resume = {
    _id: 'resume-1',
    userId: { toString: () => userId },
    creationMethod: 'imported',
    fullName: 'Jordan Reyes',
    email: 'jordan@example.com',
    summary: 'Results-driven engineer with a proven track record.',
    skills: ['TypeScript'],
    experience: [
      {
        title: 'Engineer',
        company: 'Acme',
        startDate: '2022-01',
        achievements: ['Built APIs.', 'Built services.'],
      },
    ],
  };

  const resumeModel = {
    findOne: jest.fn(),
  };
  const aiContent = {
    analyze: jest.fn(() => ({
      composite: 78,
      detectorVersion: 'test',
      weightingVersion: 'test',
      signals: {
        sentenceLengthVariance: { value: 0, likelihood: 82, explanation: 'Sentence lengths are too uniform.' },
        vocabularyDiversity: { value: 0.5, likelihood: 30, explanation: 'Vocabulary is varied.' },
        repetitiveSentenceOpeners: { value: 0.5, likelihood: 75, explanation: 'Openers repeat.' },
        stockPhrases: { value: 1, likelihood: 90, explanation: 'Stock phrases were found.' },
        punctuationBulletSectionRegularity: { value: 1, likelihood: 70, explanation: 'Bullets are overly regular.' },
        readability: { value: 60, likelihood: 45, explanation: 'Readability is near the configured center.' },
      },
    })),
  };
  const jobDescriptions = {
    resolve: jest.fn(),
  };
  const storage = {
    put: jest.fn().mockResolvedValue({ key: 'resumes/compare/original.pdf' }),
    getBuffer: jest.fn().mockResolvedValue(Buffer.from('%PDF-preview')),
  };
  const agentReview = {
    review: jest.fn(),
  };
  const parser = { extractText: jest.fn(), heuristicParse: jest.fn() };

  let service: ResumeComparisonService;

  beforeEach(() => {
    jest.clearAllMocks();
    parser.extractText.mockResolvedValue('John Doe\nSummary\nDeveloper with Kubernetes experience.\nExperience\nSoftware Engineer | Example Co\nDeployed 8 containerised services.');
    parser.heuristicParse.mockReturnValue({ summary: 'Developer with Kubernetes experience.', experience: [{ title: 'Software Engineer', company: 'Example Co', achievements: ['Deployed 8 containerised services.'] }], skills: [], education: [] });
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve(resume) });
    service = new (ResumeComparisonService as any)(
      resumeModel as any,
      aiContent as any,
      jobDescriptions as any,
      storage as any,
      agentReview as any,
      parser as any,
    );
    agentReview.review.mockResolvedValue({
      source: 'agent-session',
      sessionId: 'candidate-ats-session-1',
      harness: 'opencode',
      modelAlias: 'bedrock/nova-2-lite/low',
      ats: {
        score: 81,
        findings: [{
          code: 'AGENT_ATS_1',
          severity: 'warning',
          message: 'The first bullet is too vague for an ATS reviewer.',
          fix: 'Name the API type, scale, and measured result.',
          section: 'experience',
          quote: 'Built APIs.',
        }],
      },
      match: {
        coverage: 63,
        matched: ['typescript'],
        missing: ['aws'],
        keywordCount: 2,
      },
      annotations: [
        {
          id: 'agent-1',
          section: 'experience',
          severity: 'warning',
          color: 'amber',
          message: 'This bullet does not show scope or impact.',
          fix: 'State what the API served and quantify the outcome.',
          quote: 'Built APIs.',
        },
        {
          id: 'agent-2',
          section: 'experience',
          severity: 'critical',
          color: 'red',
          message: 'This second bullet repeats the same weak construction.',
          fix: 'Replace it with a distinct, job-relevant accomplishment.',
          quote: 'Built services.',
        },
      ],
    });
  });

  it('requires a job description or URL before comparison starts', async () => {
    await expect(service.compare('resume-1', userId, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('resolves a job URL and matches against the extracted posting', async () => {
    jobDescriptions.resolve.mockResolvedValue({ description: 'TypeScript and AWS role' });

    const result = await service.compare('resume-1', userId, {
      jobUrl: 'https://jobs.example.com/role',
    } as any);

    expect(result.match.coverage).toBe(63);
    expect(result.ats.missingSections).toEqual(['education', 'achievements']);
    expect(agentReview.review).toHaveBeenCalledWith(expect.objectContaining({
      jobDescription: 'TypeScript and AWS role',
    }), { forceRefresh: false });
  });

  it('uses an explicitly changed job URL instead of stale saved description', async () => {
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve({
      ...resume,
      source: { jobDescription: 'Old posting' },
    }) });
    jobDescriptions.resolve.mockResolvedValue({ description: 'New posting' });

    await service.compare('resume-1', userId, {
      jobDescription: '',
      jobUrl: 'https://jobs.example.com/new',
    });

    expect(agentReview.review).toHaveBeenCalledWith(expect.objectContaining({
      jobDescription: 'New posting',
    }), { forceRefresh: false });
  });

  it('retains an uploaded source file for an owned imported resume', async () => {
    const owned = {
      ...resume,
      source: { originalFilename: 'resume.pdf' } as any,
      save: jest.fn().mockResolvedValue(undefined),
    };
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve(owned) });
    const file = {
      originalname: 'resume.pdf',
      mimetype: 'text/html',
      buffer: Buffer.from('%PDF-preview'),
    } as any;

    await (service as any).attachSource('resume-1', userId, file);
    const document = await (service as any).getSource('resume-1', userId);

    expect(document.buffer.toString()).toBe('%PDF-preview');
    expect(document.mimeType).toBe('application/pdf');
    expect(owned.source).toEqual(expect.objectContaining({ storageKey: expect.any(String) }));
  });

  it('fills missing saved details from the original file and reports absent core sections', async () => {
    const saved = { ...resume, fullName: '', summary: '', experience: [], skills: [], education: [], achievements: [],
      source: { storageKey: `resumes/compare/${userId}/original.pdf`, originalFilename: 'resume.pdf', jobDescription: 'Backend engineer' },
      save: jest.fn().mockResolvedValue(undefined) };
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve(saved) });
    parser.heuristicParse.mockReturnValueOnce({ fullName: 'John Doe', summary: 'Developer with Kubernetes experience.', experience: [{ title: 'Software Engineer', company: 'Example Co', achievements: ['Deployed 8 containerised services.'] }], skills: [], education: [] });

    const result = await service.compare('resume-1', userId, {});

    expect(saved.save).toHaveBeenCalledTimes(1);
    expect(saved.summary).toContain('Kubernetes experience');
    expect(saved.fullName).toBe('John Doe');
    expect(saved.experience).toEqual(expect.arrayContaining([expect.objectContaining({ company: 'Example Co' })]));
    expect(result.details).toEqual(expect.objectContaining({ summary: saved.summary, experience: saved.experience }));
    expect(result.ats.missingSections).toEqual(['skills', 'education', 'achievements']);
    expect(result.ats.explanation).toContain('Missing sections: Skills, Education, Achievements.');
  });

  it('retains a legacy DOC source with its safe server-side content type', async () => {
    const owned = {
      ...resume,
      source: { originalFilename: 'resume.doc' } as any,
      save: jest.fn().mockResolvedValue(undefined),
    };
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve(owned) });

    await service.attachSource('resume-1', userId, {
      originalname: 'resume.doc',
      mimetype: 'application/octet-stream',
      buffer: Buffer.from('legacy-doc'),
    } as any);

    expect(owned.source).toEqual(expect.objectContaining({
      fileExtension: '.doc',
      mimeType: 'application/msword',
    }));
  });

  it('refuses a source key outside the authenticated user path', async () => {
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve({
      ...resume,
      source: { storageKey: 'resumes/compare/other-user/private.pdf' },
    }) });

    await expect(service.getSource('resume-1', userId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('uses an agent for ATS/job review while keeping AI-content scoring heuristic-only', async () => {
    const result = await service.compare('resume-1', userId, {
      jobDescription: 'We need TypeScript and AWS experience.',
    });

    expect(result.resumeId).toBe('resume-1');
    expect(result.ats.score).toBe(81);
    expect(result.match).toEqual(expect.objectContaining({ coverage: 63, missing: ['aws'] }));
    expect(result.aiContent.composite).toBe(78);
    expect(result.review).toEqual(expect.objectContaining({
      source: 'agent-session',
      sessionId: 'candidate-ats-session-1',
      harness: 'opencode',
    }));
    expect(agentReview.review).toHaveBeenCalledWith(expect.objectContaining({
      userId,
      resumeId: 'resume-1',
      jobDescription: 'We need TypeScript and AWS experience.',
      resumeText: expect.stringContaining('Built APIs.'),
    }), { forceRefresh: false });
    expect(result.annotations).toHaveLength(2);
    expect(result.annotations).toEqual(expect.arrayContaining([
      expect.objectContaining({ quote: 'Built APIs.', message: expect.stringContaining('scope') }),
      expect.objectContaining({ quote: 'Built services.', message: expect.stringContaining('repeats') }),
    ]));
    expect(result.annotations.some((item) => item.id.startsWith('ai-'))).toBe(false);
    expect(result.annotations.every((item) => item.fix)).toBe(true);
  });

  it('reviews the complete source PDF when structured import lost the professional sections', async () => {
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve({
      ...resume,
      summary: '',
      experience: [],
      skills: [],
      source: { storageKey: `resumes/compare/${userId}/original.pdf`, originalFilename: 'original.pdf' },
      save: jest.fn().mockResolvedValue(undefined),
    }) });

    await service.compare('resume-1', userId, { jobDescription: 'Kubernetes role' });

    expect(parser.extractText).toHaveBeenCalled();
    expect(agentReview.review).toHaveBeenCalledWith(expect.objectContaining({
      resumeText: expect.stringContaining('Deployed 8 containerised services.'),
      originalFile: expect.objectContaining({ filename: 'original.pdf', bytes: Buffer.from('%PDF-preview') }),
    }), { forceRefresh: false });
    expect(aiContent.analyze).toHaveBeenCalledWith(expect.stringContaining('Software Engineer | Example Co'));
  });

  it('fails closed when an attached original cannot be extracted instead of scoring contact-only import fields', async () => {
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve({
      ...resume, summary: '', experience: [],
      source: { storageKey: `resumes/compare/${userId}/original.pdf`, originalFilename: 'original.pdf' },
    }) });
    parser.extractText.mockRejectedValueOnce(new Error('PDF extraction failed'));

    await expect(service.compare('resume-1', userId, { jobDescription: 'Cloud role' }))
      .rejects.toThrow('PDF extraction failed');
    expect(agentReview.review).not.toHaveBeenCalled();
  });

  it('drops agent comments whose quote was not copied from the resume', async () => {
    agentReview.review.mockResolvedValueOnce({
      source: 'agent-session',
      sessionId: 'candidate-ats-session-2',
      harness: 'opencode',
      modelAlias: 'bedrock/nova-2-lite/low',
      ats: { score: 70, findings: [] },
      match: { coverage: 60, matched: [], missing: [], keywordCount: 0 },
      annotations: [
        {
          id: 'grounded', section: 'summary', severity: 'warning', color: 'amber',
          message: 'Generic opening.', fix: 'Lead with a concrete specialization.', quote: 'Results-driven engineer',
        },
        {
          id: 'invented', section: 'experience', severity: 'critical', color: 'red',
          message: 'Invented quote.', fix: 'Should never appear.', quote: 'Managed a team of 50 engineers',
        },
      ],
    });

    const result = await service.compare('resume-1', userId, { jobDescription: 'Backend engineer' });

    expect(result.annotations.map((item) => item.id)).toEqual(['grounded']);
  });

  it('does not compare an AI harness-owned document', async () => {
    resumeModel.findOne.mockReturnValue({
      exec: () => Promise.resolve({ ...resume, creationMethod: 'ai_generated' }),
    });

    await expect(service.compare('resume-1', userId, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('passes all resume sections to the agent without turning heuristic stock phrases into comments', async () => {
    resumeModel.findOne.mockReturnValue({
      exec: () => Promise.resolve({
        ...resume,
        summary: 'Backend engineer focused on payments.',
        experience: [{
          ...resume.experience[0],
          description: 'Results-driven delivery across the platform.',
        }],
      }),
    });

    const result = await service.compare('resume-1', userId, { jobDescription: 'Backend engineer' });

    expect(agentReview.review).toHaveBeenCalledWith(expect.objectContaining({
      resumeText: expect.stringContaining('Results-driven delivery across the platform.'),
    }), { forceRefresh: false });
    expect(result.annotations.some((item) => item.id === 'ai-stock-phrases')).toBe(false);
  });

  it('does not expose another user\'s imported resume', async () => {
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve(null) });

    await expect(service.compare('resume-1', userId, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
