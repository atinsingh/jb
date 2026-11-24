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
  const agent = {
    review: jest.fn().mockResolvedValue({
      source: 'agent-session', sessionId: 'review-1', harness: 'opencode', modelAlias: 'automatic',
      ats: { explanation: 'Review of the original document.' }, match: { explanation: 'Review against the job.' }, annotations: [],
    }),
    beginReview: jest.fn().mockResolvedValue({ pending: true, sessionId: 'review-1' }),
  };
  const harness = { startSession: jest.fn() };
  const aliases = { resolveAutomaticForUser: jest.fn() };
  const reviews = { findOne: jest.fn() };
  const chat = jest.fn();
  const llm = { getProviderForFeature: jest.fn(() => ({ chat })) };

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
      agent,
      harness,
      aliases,
      reviews,
      llm,
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

  it('does not fill an original résumé from the heading heuristic', async () => {
    const saved = { ...resume, fullName: '', summary: '', experience: [], skills: [], education: [], achievements: [],
      source: { storageKey: `resumes/compare/${userId}/original.pdf`, originalFilename: 'resume.pdf', jobDescription: 'Backend engineer' },
      save: jest.fn().mockResolvedValue(undefined) };
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve(saved) });
    parser.extractText.mockResolvedValue('Alex Chen\nEngineering Description\nDesigned distributed systems for billing.');

    const result = await service.compare('resume-1', userId, {});

    expect(parser.heuristicParse).not.toHaveBeenCalled();
    expect(saved.save).not.toHaveBeenCalled();
    expect(saved.summary).toBe('');
    expect(result.details).toEqual({});
    expect(result.ats.missingSections).toEqual([]);
    expect(result.ats.explanation).not.toContain('Missing sections');
    expect(agent.beginReview).toHaveBeenCalledWith(
      expect.objectContaining({ missingSections: [] }),
      { forceRefresh: false },
    );
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
    expect(result.review.source).toBe('agent-session');
    expect(result.pending).toBe(true);
    expect(result.review.sessionId).toBe('review-1');
    expect(result.annotations).toEqual(expect.arrayContaining([
      expect.objectContaining({ section: 'skills', message: expect.stringContaining('AWS') }),
      expect.objectContaining({ quote: 'Results-driven', fix: expect.any(String) }),
    ]));
    expect(result.annotations).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ quote: 'Built APIs.' }),
    ]));
    expect(agent.beginReview).toHaveBeenCalled();
    expect(agent.review).not.toHaveBeenCalled();
  });

  it('saves agent-extracted text from an equivalent heading and drops text that is not in the file', async () => {
    const saved = {
      ...resume,
      summary: '',
      experience: [{ title: '', company: '' }],
      skills: [''],
      source: {
        storageKey: `resumes/compare/${userId}/original.pdf`,
        originalFilename: 'resume.pdf',
        jobDescription: 'Backend engineer',
      },
      save: jest.fn().mockResolvedValue(undefined),
    };
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve(saved) });
    parser.extractText.mockResolvedValue([
      'Alex Chen',
      'Engineering Description',
      'Designed distributed systems for billing.',
      'Engineer',
      'Example Co',
    ].join('\n'));
    reviews.findOne.mockReturnValue({ exec: async () => ({
      status: 'completed',
      jobText: 'Backend engineer',
      result: {
        annotations: [{
          id: 'agent-1', section: 'summary', severity: 'warning',
          message: 'Name the system.', fix: 'Ask which system.', quote: 'Designed distributed systems for billing.',
        }],
        extracted: {
          summary: 'Designed distributed systems for billing. Led a team of 40.',
          experience: [{ title: 'Engineer', company: 'Example Co', achievements: ['Invented a 40% speedup.'] }],
        },
        absentSections: ['summary', 'skills', 'education'],
      },
    }) });

    const comments = await service.reviewComments('resume-1', userId, 'review-1');

    expect(saved.summary).toBe('Designed distributed systems for billing.');
    expect(saved.experience).toEqual([expect.objectContaining({ title: 'Engineer', company: 'Example Co' })]);
    expect(JSON.stringify(saved.experience)).not.toContain('40%');
    expect(saved.save).toHaveBeenCalledTimes(1);
    expect(comments.details).toEqual(expect.objectContaining({ summary: saved.summary }));
    expect(comments.missingSections).toEqual(['skills', 'education']);
  });

  it('replaces unedited heuristic fields with agent extraction while preserving user-edited fields', async () => {
    const heuristicDoc = {
      ...resume,
      summary: 'Wrong partial heuristic summary',
      skills: ['BrokenSkill'],
      experience: [{ title: 'Mangled Location: Toronto', company: 'Client: X', achievements: [] }],
      source: {
        storageKey: `resumes/compare/${userId}/original.pdf`,
        originalFilename: 'resume.pdf',
        jobDescription: 'Backend engineer',
        parseStatus: 'partial',
      },
      save: jest.fn().mockResolvedValue(undefined),
      markModified: jest.fn(),
    };
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve(heuristicDoc) });
    parser.extractText.mockResolvedValue([
      'Alex Chen',
      'Engineering Description',
      'Designed distributed systems for billing.',
      'Technical Stack',
      'TypeScript, PostgreSQL',
      'Work History',
      'Staff Engineer | Example Co',
      'Shipped payment APIs.',
      'Publications',
      'Scaling Billing Queues, 2024',
    ].join('\n'));
    reviews.findOne.mockReturnValue({ exec: async () => ({
      status: 'completed',
      jobText: 'Backend engineer',
      result: {
        annotations: [],
        extracted: {
          summary: 'Designed distributed systems for billing.',
          skills: ['TypeScript', 'PostgreSQL'],
          experience: [{ title: 'Staff Engineer', company: 'Example Co', achievements: ['Shipped payment APIs.'] }],
          customSections: [{ heading: 'Publications', items: ['Scaling Billing Queues, 2024'] }],
        },
        absentSections: ['education'],
      },
    }) });

    const comments = await service.reviewComments('resume-1', userId, 'review-1');

    expect(heuristicDoc.summary).toBe('Designed distributed systems for billing.');
    expect(heuristicDoc.skills).toEqual(['TypeScript', 'PostgreSQL']);
    expect(heuristicDoc.experience).toEqual([
      expect.objectContaining({ title: 'Staff Engineer', company: 'Example Co' }),
    ]);
    expect((heuristicDoc as any).customSections).toEqual([
      { heading: 'Publications', items: ['Scaling Billing Queues, 2024'] },
    ]);
    expect(heuristicDoc.source.parseStatus).toBe('parsed');
    expect(comments.details).toEqual(expect.objectContaining({
      summary: 'Designed distributed systems for billing.',
      skills: ['TypeScript', 'PostgreSQL'],
      customSections: [{ heading: 'Publications', items: ['Scaling Billing Queues, 2024'] }],
    }));

    // Once user-edited, a later review must not overwrite manual edits.
    const editedDoc = {
      ...resume,
      summary: 'My manually edited summary',
      skills: ['CustomSkill'],
      source: {
        storageKey: `resumes/compare/${userId}/original.pdf`,
        originalFilename: 'resume.pdf',
        jobDescription: 'Backend engineer',
        parseStatus: 'user_edited',
      },
      save: jest.fn().mockResolvedValue(undefined),
    };
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve(editedDoc) });

    const afterEdit = await service.reviewComments('resume-1', userId, 'review-1');

    expect(editedDoc.summary).toBe('My manually edited summary');
    expect(editedDoc.skills).toEqual(['CustomSkill']);
    expect(editedDoc.save).not.toHaveBeenCalled();
    expect(afterEdit.details).toEqual({});
  });

  it('applies cached review details and missing sections directly in compare()', async () => {
    const saved = {
      ...resume,
      summary: '',
      skills: [],
      experience: [],
      source: {
        storageKey: `resumes/compare/${userId}/original.pdf`,
        originalFilename: 'resume.pdf',
        jobDescription: 'Backend engineer',
        parseStatus: 'pending',
      },
      save: jest.fn().mockResolvedValue(undefined),
      markModified: jest.fn(),
    };
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve(saved) });
    parser.extractText.mockResolvedValue('Alex Chen\nEngineering Description\nDesigned distributed systems for billing.');
    agent.beginReview.mockResolvedValueOnce({
      pending: false,
      result: {
        source: 'agent-session',
        sessionId: 'cached-1',
        harness: 'opencode',
        modelAlias: 'automatic',
        annotations: [],
        extracted: { summary: 'Designed distributed systems for billing.' },
        absentSections: ['summary', 'skills'],
      },
    });

    const result = await service.compare('resume-1', userId, {});

    expect(result.pending).toBe(false);
    expect(result.details).toEqual({ summary: 'Designed distributed systems for billing.' });
    expect(result.ats.missingSections).toEqual(['skills']);
    expect(saved.summary).toBe('Designed distributed systems for billing.');
    expect(saved.save).toHaveBeenCalledTimes(1);
  });

  it('prefers agent extraction over stale heuristic fields when preparing correction facts', async () => {
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve({
      ...resume,
      summary: 'Mangled heuristic summary',
      skills: ['BrokenSkill'],
      experience: [{ title: 'Broken', company: 'Heuristic Co', achievements: [] }],
      source: {
        storageKey: `resumes/compare/${userId}/original.pdf`,
        originalFilename: 'resume.pdf',
        jobDescription: 'Backend engineer',
        parseStatus: 'partial',
      },
    }) });
    parser.extractText.mockResolvedValue([
      'Alex Chen',
      'Engineering Description',
      'Designed distributed systems for billing.',
      'Staff Engineer',
      'Example Co',
      'Shipped payment APIs.',
      'Publications',
      'Scaling Billing Queues, 2024',
    ].join('\n'));
    reviews.findOne.mockReturnValue({ sort: () => ({ exec: async () => ({
      jobText: 'Backend engineer',
      result: {
        annotations: [],
        extracted: {
          summary: 'Designed distributed systems for billing.',
          experience: [{ title: 'Staff Engineer', company: 'Example Co', achievements: ['Shipped payment APIs.'] }],
          customSections: [{ heading: 'Publications', items: ['Scaling Billing Queues, 2024'] }],
        },
      },
    }) }) });
    aliases.resolveAutomaticForUser.mockResolvedValue({ model: 'nova', effort: 'low' });
    harness.startSession.mockResolvedValue({ id: 'session-3' });

    await service.prepareCorrection('resume-1', userId, 'classic');

    const facts = harness.startSession.mock.calls[0][1].candidateFacts as string;
    expect(facts).toContain('Designed distributed systems for billing.');
    expect(facts).toContain('Staff Engineer');
    expect(facts).toContain('Example Co');
    expect(facts).toContain('## Publications');
    expect(facts).toContain('Scaling Billing Queues, 2024');
    expect(facts).not.toContain('Mangled heuristic summary');
    expect(facts).not.toContain('Heuristic Co');
  });

  it('fills an empty experience list when a mongoose parent link points back at the list', async () => {
    const job: Record<string, unknown> = { title: '', company: '', achievements: [] };
    const experience: unknown[] = [job];
    job.parent = experience;
    const saved = {
      ...resume,
      summary: '',
      skills: [],
      experience,
      source: {
        storageKey: `resumes/compare/${userId}/original.pdf`,
        originalFilename: 'resume.pdf',
        jobDescription: 'Backend engineer',
      },
      save: jest.fn().mockResolvedValue(undefined),
    };
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve(saved) });
    parser.extractText.mockResolvedValue([
      'Alex Chen',
      'Engineer at Example Co',
      'Designed billing services for the platform.',
    ].join('\n'));
    reviews.findOne.mockReturnValue({ exec: async () => ({
      status: 'completed',
      jobText: 'Backend engineer',
      result: {
        annotations: [],
        extracted: {
          experience: [{ title: 'Engineer', company: 'Example Co', achievements: [] }],
        },
        absentSections: [],
      },
    }) });

    const comments = await service.reviewComments('resume-1', userId, 'review-1');

    expect(comments.status).toBe('completed');
    expect(saved.experience).toEqual([expect.objectContaining({ title: 'Engineer', company: 'Example Co' })]);
  });

  it('merges grounded review comments when the owner session completes', async () => {
    reviews.findOne.mockReturnValue({ exec: async () => ({
      status: 'completed',
      jobText: 'TypeScript and AWS required.',
      result: { annotations: [{
        id: 'agent-1', section: 'experience', severity: 'warning',
        message: 'Name the billing system.', fix: 'Say which system you built.', quote: 'Built APIs.',
      }] },
    }) });

    const comments = await service.reviewComments('resume-1', userId, 'review-1');

    expect(comments.status).toBe('completed');
    expect(comments.annotations).toEqual(expect.arrayContaining([
      expect.objectContaining({ quote: 'Built APIs.', message: 'Name the billing system.' }),
      expect.objectContaining({ section: 'skills', message: expect.stringContaining('AWS') }),
    ]));
  });

  it('does not turn a failed review into a comment list', async () => {
    reviews.findOne.mockReturnValue({ exec: async () => ({
      status: 'failed', failureReason: 'INSUFFICIENT_GROUNDED_COMMENTS',
    }) });

    const comments = await service.reviewComments('resume-1', userId, 'review-1');

    expect(comments).toEqual({ status: 'failed', failureReason: 'INSUFFICIENT_GROUNDED_COMMENTS' });
    expect(comments.annotations).toBeUndefined();
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

  it('starts a template session from the uploaded résumé and the latest review fixes', async () => {
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve({
      ...resume,
      name: 'Backend résumé',
      source: { jobDescription: 'Backend engineer' },
    }) });
    reviews.findOne.mockReturnValue({ sort: () => ({ exec: async () => ({
      jobText: 'Backend engineer',
      result: { annotations: [{ message: 'Vague', fix: 'Name the billing system.', quote: 'Built APIs.' }] },
    }) }) });
    aliases.resolveAutomaticForUser.mockResolvedValue({ model: 'nova', effort: 'low' });
    harness.startSession.mockResolvedValue({ id: 'session-1' });

    const prepared = await service.prepareCorrection('resume-1', userId, 'classic');

    expect(harness.startSession).toHaveBeenCalledWith(userId, expect.objectContaining({
      model: 'nova',
      effort: 'low',
      templateKey: 'classic',
      targetRole: 'Backend résumé',
      jobDescription: 'Backend engineer',
      candidateFacts: expect.stringContaining('Acme'),
    }));
    expect(harness.startSession.mock.calls[0][1].candidateAddendum).toBeUndefined();
    expect(harness.startSession.mock.calls[0][1].candidateFacts).not.toContain('profile above');
    expect(prepared.instruction).toContain('Name the billing system.');
    expect(prepared.session.id).toBe('session-1');
  });

  it('uses the original file when the saved résumé has no biographical details', async () => {
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve({
      ...resume,
      fullName: '',
      email: '',
      summary: '',
      skills: [],
      experience: [],
      source: {
        storageKey: `resumes/compare/${userId}/original.pdf`,
        originalFilename: 'resume.pdf',
        jobDescription: 'Backend engineer',
      },
    }) });
    parser.extractText.mockResolvedValue('Alex Chen\nalex@example.com\nEngineer\nExample Co\nToronto\nShipped billing.');
    reviews.findOne.mockReturnValue({ sort: () => ({ exec: async () => ({
      jobText: 'Backend engineer',
      result: {
        annotations: [{ message: 'Vague', fix: 'Name the billing system.', quote: 'Built APIs.' }],
        extracted: {
          fullName: 'Alex Chen',
          email: 'alex@example.com',
          summary: 'Raised revenue 400% with a new market.',
          experience: [{ title: 'Engineer', company: 'Example Co', location: 'Toronto', achievements: ['Shipped billing.'] }],
        },
      },
    }) }) });
    aliases.resolveAutomaticForUser.mockResolvedValue({ model: 'nova', effort: 'low' });
    harness.startSession.mockResolvedValue({ id: 'session-2' });

    await service.prepareCorrection('resume-1', userId, 'classic');

    const facts = harness.startSession.mock.calls[0][1].candidateFacts as string;
    expect(parser.heuristicParse).not.toHaveBeenCalled();
    expect(facts).toContain('Alex Chen');
    expect(facts).toContain('alex@example.com');
    expect(facts).toContain('Example Co');
    expect(facts).toContain('Toronto');
    expect(facts).toContain('Shipped billing.');
    expect(facts).not.toContain('400%');
    expect(facts).not.toContain('Jordan Reyes');
  });

  it('does not generate from a review of a different job', async () => {
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve({
      ...resume,
      source: { jobDescription: 'New role' },
    }) });
    reviews.findOne.mockReturnValue({ sort: () => ({ exec: async () => ({
      jobText: 'Backend engineer',
      result: { annotations: [{ fix: 'Name the billing system.' }], extracted: { summary: 'Old summary.' } },
    }) }) });

    await expect(service.prepareCorrection('resume-1', userId, 'classic')).rejects.toBeInstanceOf(BadRequestException);
    expect(harness.startSession).not.toHaveBeenCalled();
  });

  it('does not start a corrected résumé when the original file cannot be read', async () => {
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve({
      ...resume,
      summary: '',
      source: {
        storageKey: `resumes/compare/${userId}/original.pdf`,
        originalFilename: 'resume.pdf',
        jobDescription: 'Backend engineer',
      },
    }) });
    parser.extractText.mockRejectedValueOnce(new Error('PDF extraction failed'));
    reviews.findOne.mockReturnValue({ sort: () => ({ exec: async () => ({
      jobText: 'Backend engineer',
      result: { extracted: { summary: 'Designed distributed systems for billing.' }, annotations: [] },
    }) }) });

    await expect(service.prepareCorrection('resume-1', userId, 'classic')).rejects.toBeInstanceOf(BadRequestException);
    expect(harness.startSession).not.toHaveBeenCalled();
  });

  it('does not start a corrected résumé before a comparison exists', async () => {
    reviews.findOne.mockReturnValue({ sort: () => ({ exec: async () => null }) });

    await expect(service.prepareCorrection('resume-1', userId, 'classic')).rejects.toBeInstanceOf(BadRequestException);
    expect(harness.startSession).not.toHaveBeenCalled();
  });

  it('rewrites wait bites with the default model and drops lines that are not in the résumé', async () => {
    resume.skills = ['TypeScript', 'SQL'];
    chat.mockResolvedValue({
      content: JSON.stringify({
        bites: [
          { label: 'TypeScript APIs', detail: 'Built APIs at Acme as an Engineer.' },
          { label: 'SQL', detail: 'SQL at Acme.' },
          { label: 'Raised revenue 400%', detail: 'Invented a new market.' },
        ],
      }),
    });

    try {
      const result = await service.waitBites('resume-1', userId);

      expect(llm.getProviderForFeature).toHaveBeenCalledWith('rewriteBullets', userId);
      expect(chat.mock.calls[0][0].model).toBeUndefined();
      expect(result.bites).toEqual([
        { label: 'TypeScript APIs', detail: 'Built APIs at Acme as an Engineer.' },
        { label: 'SQL', detail: 'SQL at Acme.' },
      ]);
    } finally {
      resume.skills = ['TypeScript'];
    }
  });

  it('uses résumé bullets when the model only echoes the job header', async () => {
    const experience = resume.experience;
    resume.summary = '';
    resume.skills = [];
    resume.experience = [{
      title: 'Backend Developer Location: Toronto',
      company: 'ON Client: XXXXX XXX Duration: Responsibilities:',
      startDate: '2022-01',
      achievements: [
        'Developed backend services using Java 17 and Spring Boot for enterprise applications that stayed in production for years.',
        'Designed database solutions using PostgreSQL and Oracle.',
      ],
    }];
    chat.mockResolvedValue({
      content: JSON.stringify({
        bites: [{
          label: 'Backend Developer Location: Toronto at ON',
          detail: 'Client: XXXXX XXX Duration: Responsibilities:',
        }],
      }),
    });

    try {
      const result = await service.waitBites('resume-1', userId);
      const text = result.bites.map((bite) => `${bite.label} ${bite.detail}`).join(' ');
      expect(text).not.toMatch(/Location:|Client:|Duration:|Responsibilities:/);
      const java = result.bites.find((bite) => bite.detail.includes('Java 17'));
      expect(java?.label).toBe('Developed backend services using Java 17 and Spring Boot for enterprise applications that stayed in production for years.');
      expect(java?.detail).toBe(java?.label);
      expect(java?.label).not.toContain('…');
      expect(text).toContain('PostgreSQL');
    } finally {
      resume.summary = 'Results-driven engineer with a proven track record.';
      resume.skills = ['TypeScript'];
      resume.experience = experience;
    }
  });

  it('does not expose another user\'s imported resume', async () => {
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve(null) });

    await expect(service.compare('resume-1', userId, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
