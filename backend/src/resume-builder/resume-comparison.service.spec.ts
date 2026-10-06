import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ResumeComparisonService } from './resume-comparison.service';
import { AtsParseabilityService } from '../ats/ats-parseability.service';
import { AtsMatchService } from '../ats/ats-match.service';

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
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
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
      parser as any,
      new AtsParseabilityService(),
      new AtsMatchService(),
    );

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

    expect(result.match.coverage).toBe(50);
    expect(result.ats.missingSections).toEqual(['education', 'achievements']);

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

    expect(jobDescriptions.resolve).toHaveBeenCalledWith('https://jobs.example.com/new');

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

  it('returns local scores and actionable job gaps', async () => {
    const result = await service.compare('resume-1', userId, { jobDescription: 'TypeScript and AWS required.' });
    expect(result.match.coverage).toBe(50);
    expect(result.aiContent.composite).toBe(78);
    expect(result.review.source).toBe('deterministic');
    expect(result.annotations).toEqual(expect.arrayContaining([
      expect.objectContaining({ section: 'skills', message: expect.stringContaining('AWS') }),
      expect.objectContaining({ quote: 'Results-driven', fix: expect.any(String) }),
    ]));
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
    const second = await service.compare('resume-1', userId, { jobDescription: 'Kubernetes role' });
    expect(second.match.coverage).toBe(100);
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
  });

  it('does not compare an AI harness-owned document', async () => {
    resumeModel.findOne.mockReturnValue({
      exec: () => Promise.resolve({ ...resume, creationMethod: 'ai_generated' }),
    });

    await expect(service.compare('resume-1', userId, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('does not expose another user\'s imported resume', async () => {
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve(null) });

    await expect(service.compare('resume-1', userId, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
