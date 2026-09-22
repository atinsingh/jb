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
  const atsParseability = {
    check: jest.fn(() => ({
      score: 72,
      extractedTextLength: 140,
      findings: [
        {
          code: 'MISSING_PHONE',
          severity: 'warning',
          message: 'A phone number is missing.',
          fix: 'Add a current phone number.',
        },
      ],
    })),
  };
  const atsMatch = {
    match: jest.fn(() => ({
      coverage: 50,
      matched: ['typescript'],
      missing: ['aws'],
      keywordCount: 2,
    })),
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

  let service: ResumeComparisonService;

  beforeEach(() => {
    jest.clearAllMocks();
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve(resume) });
    service = new ResumeComparisonService(
      resumeModel as any,
      atsParseability as any,
      atsMatch as any,
      aiContent as any,
    );
  });

  it('combines ATS and AI-content signals into manual improvement annotations', async () => {
    const result = await service.compare('resume-1', userId, {
      jobDescription: 'We need TypeScript and AWS experience.',
    });

    expect(result.resumeId).toBe('resume-1');
    expect(result.ats.score).toBe(72);
    expect(result.match).toEqual(expect.objectContaining({ coverage: 50, missing: ['aws'] }));
    expect(result.aiContent.composite).toBe(78);
    expect(result.annotations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ section: 'personal', severity: 'warning', color: 'amber' }),
        expect.objectContaining({ section: 'skills', color: 'amber', message: expect.stringContaining('AWS') }),
        expect.objectContaining({ section: 'summary', color: 'red', quote: 'Results-driven' }),
        expect.objectContaining({ section: 'experience', color: 'red' }),
      ]),
    );
    expect(result.annotations.every((item) => item.fix)).toBe(true);
  });

  it('does not compare an AI harness-owned document', async () => {
    resumeModel.findOne.mockReturnValue({
      exec: () => Promise.resolve({ ...resume, creationMethod: 'ai_generated' }),
    });

    await expect(service.compare('resume-1', userId, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('points a stock phrase annotation at experience when the phrase is not in summary', async () => {
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

    const result = await service.compare('resume-1', userId, {});

    expect(result.annotations).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'ai-stock-phrases', section: 'experience' }),
    ]));
  });

  it('does not expose another user\'s imported resume', async () => {
    resumeModel.findOne.mockReturnValue({ exec: () => Promise.resolve(null) });

    await expect(service.compare('resume-1', userId, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
