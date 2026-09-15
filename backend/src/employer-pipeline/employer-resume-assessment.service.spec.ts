import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { EmployerResumeAssessmentService } from './employer-resume-assessment.service';
import { ResumeAiContentHeuristicService } from './resume-ai-content-heuristic.service';

const OWNER = new Types.ObjectId('64b000000000000000000001');
const OTHER_OWNER = new Types.ObjectId('64b000000000000000000002');
const APPLICANT = new Types.ObjectId('64b000000000000000000003');
const APPLICATION = new Types.ObjectId('64b000000000000000000004');
const ARTIFACT = new Types.ObjectId('64b000000000000000000005');
const JOB = new Types.ObjectId('64b000000000000000000006');

const query = (value: any) => ({
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(value),
});

describe('EmployerResumeAssessmentService', () => {
  const applicantModel = {
    findOne: jest.fn(),
    updateOne: jest.fn(),
  };
  const artifactModel = { findOne: jest.fn() };
  const employerJobModel = { findOne: jest.fn() };
  const gateway = { assess: jest.fn() };
  const heuristic = new ResumeAiContentHeuristicService();
  let service: EmployerResumeAssessmentService;

  const linkedApplicant = () => ({
    _id: APPLICANT,
    ownerId: OWNER,
    applicationId: APPLICATION,
    jobId: JOB,
    aiScore: 91,
    submittedResume: {
      artifactId: ARTIFACT,
      version: 7,
      hash: 'resume-hash-v7',
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    applicantModel.findOne.mockReset();
    applicantModel.updateOne.mockReset();
    artifactModel.findOne.mockReset();
    employerJobModel.findOne.mockReset();
    gateway.assess.mockReset();
    applicantModel.findOne.mockReturnValue(query(linkedApplicant()));
    applicantModel.updateOne.mockReturnValue(
      query({ acknowledged: true, modifiedCount: 1 }),
    );
    artifactModel.findOne.mockReturnValue(
      query({
        _id: ARTIFACT,
        applicationId: APPLICATION,
        userId: new Types.ObjectId('64b000000000000000000009'),
        version: 7,
        metadata: { sha256: 'resume-hash-v7' },
        content: JSON.stringify({
          summary: 'Reliable backend engineer.',
          skills: ['TypeScript', 'MongoDB'],
        }),
      }),
    );
    employerJobModel.findOne.mockReturnValue(
      query({
        _id: JOB,
        ownerId: OWNER,
        description: 'Build reliable backend services.',
        responsibilities: ['Own APIs'],
        requirements: ['TypeScript'],
        skills: ['MongoDB'],
      }),
    );
    gateway.assess.mockResolvedValue({
      status: 'BUDGET_EXHAUSTED',
      reason: 'EMPLOYER_BUDGET_EXHAUSTED',
      harness: 'ats',
    });
    service = new EmployerResumeAssessmentService(
      applicantModel as any,
      artifactModel as any,
      employerJobModel as any,
      heuristic,
      gateway as any,
    );
  });

  it('returns 404 for an applicant outside the employer ownership scope', async () => {
    applicantModel.findOne.mockReturnValue(query(null));

    await expect(
      service.assess(String(OTHER_OWNER), String(APPLICANT)),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(applicantModel.findOne).toHaveBeenCalledWith({
      _id: expect.any(Types.ObjectId),
      ownerId: expect.any(Types.ObjectId),
    });
    expect(gateway.assess).not.toHaveBeenCalled();
  });

  it('returns and persists NO_RESUME for a manual applicant without an artifact', async () => {
    applicantModel.findOne.mockReturnValue(
      query({ _id: APPLICANT, ownerId: OWNER, jobId: JOB, aiScore: 91 }),
    );

    const result = await service.assess(String(OWNER), String(APPLICANT));

    expect(result.status).toBe('NO_RESUME');
    expect(result.reason).toBe('EXACT_SUBMITTED_RESUME_REQUIRED');
    expect(gateway.assess).not.toHaveBeenCalled();
    expect(applicantModel.updateOne).toHaveBeenCalledWith(
      { _id: APPLICANT, ownerId: OWNER },
      { $set: { resumeAssessment: expect.objectContaining({ status: 'NO_RESUME' }) } },
    );
    expect(JSON.stringify(applicantModel.updateOne.mock.calls)).not.toContain('aiScore');
  });

  it('rejects an artifact whose immutable version or hash no longer matches the submitted snapshot', async () => {
    artifactModel.findOne.mockReturnValue(
      query({
        _id: ARTIFACT,
        applicationId: APPLICATION,
        version: 6,
        metadata: { sha256: 'different-resume-hash' },
        content: JSON.stringify({ summary: 'Different resume.' }),
      }),
    );

    const result = await service.assess(String(OWNER), String(APPLICANT));

    expect(result).toEqual(
      expect.objectContaining({
        status: 'NO_RESUME',
        reason: 'SUBMITTED_RESUME_ARTIFACT_MISMATCH',
      }),
    );
    expect(gateway.assess).not.toHaveBeenCalled();
  });

  it('hashes the exact employer-owned job snapshot and returns the heuristic when ATS is budget-blocked', async () => {
    const result = await service.assess(String(OWNER), String(APPLICANT));

    expect(result.status).toBe('PARTIAL');
    expect(result.ats).toEqual(
      expect.objectContaining({
        status: 'BUDGET_EXHAUSTED',
        reason: 'EMPLOYER_BUDGET_EXHAUSTED',
      }),
    );
    expect(result.aiContent).toEqual(
      expect.objectContaining({
        status: 'COMPLETE',
        detectorVersion: 'jobocate-heuristic-v1',
        weightingVersion: 'weights-v1',
      }),
    );
    expect(result.job).toEqual({
      jobId: String(JOB),
      descriptionHash:
        '15e37f54401315a7c160bcea2c03d056ccaff43265ba2566de0f24b10b2839b9',
      descriptionVersion: 1,
    });
    expect(gateway.assess).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: String(OWNER),
        applicationId: String(APPLICATION),
        resumeArtifactId: String(ARTIFACT),
        resumeHash: 'resume-hash-v7',
        jobId: String(JOB),
        jobDescriptionHash:
          '15e37f54401315a7c160bcea2c03d056ccaff43265ba2566de0f24b10b2839b9',
      }),
    );
    expect(gateway.assess.mock.calls[0][0]).not.toHaveProperty('candidateId');
    expect(JSON.stringify(applicantModel.updateOne.mock.calls)).not.toContain('aiScore');
  });

  it('prevents an older run from overwriting a newer pair', async () => {
    applicantModel.updateOne
      .mockReturnValueOnce(query({ acknowledged: true, modifiedCount: 1 }))
      .mockReturnValueOnce(query({ acknowledged: true, modifiedCount: 0 }));
    const newer = {
      ...linkedApplicant(),
      resumeAssessment: { status: 'RUNNING', runId: 'newer-run', pairKey: 'newer-pair' },
    };
    applicantModel.findOne
      .mockReturnValueOnce(query(linkedApplicant()))
      .mockReturnValueOnce(query(newer));

    const result = await service.assess(String(OWNER), String(APPLICANT));

    const finalFilter = applicantModel.updateOne.mock.calls[1][0];
    expect(finalFilter).toEqual(
      expect.objectContaining({
        _id: APPLICANT,
        ownerId: OWNER,
        'resumeAssessment.runId': expect.any(String),
        'resumeAssessment.pairKey': expect.any(String),
      }),
    );
    expect(result).toEqual(newer.resumeAssessment);
  });

  it('marks a stored result stale when the employer job description changes', async () => {
    const applicant = linkedApplicant();
    const stored: any = {
      status: 'COMPLETE',
      submittedResume: { ...applicant.submittedResume },
      job: { jobId: String(JOB), descriptionHash: 'old-job-hash', descriptionVersion: 1 },
      ats: { status: 'COMPLETE', semanticMatch: 80 },
      aiContent: { status: 'COMPLETE', composite: 20 },
    };
    const document: any = { ...applicant, resumeAssessment: stored };

    const result: any = await service.markStaleIfNeeded(String(OWNER), document);

    expect(result.resumeAssessment).toEqual(
      expect.objectContaining({
        status: 'STALE',
        staleReason: 'JOB_DESCRIPTION_CHANGED',
        staleAt: expect.any(Date),
      }),
    );
    expect(applicantModel.updateOne).toHaveBeenCalledWith(
      { _id: APPLICANT, ownerId: OWNER },
      { $set: { resumeAssessment: result.resumeAssessment } },
    );
  });

  it('does not start a duplicate run while the exact same pair is already running', async () => {
    const first = await service.assess(String(OWNER), String(APPLICANT));
    jest.clearAllMocks();
    applicantModel.findOne.mockReturnValue(
      query({
        ...linkedApplicant(),
        resumeAssessment: { ...first, status: 'RUNNING' },
      }),
    );
    artifactModel.findOne.mockReturnValue(
      query({
        _id: ARTIFACT,
        applicationId: APPLICATION,
        version: 7,
        metadata: { sha256: 'resume-hash-v7' },
        content: '{}',
      }),
    );
    employerJobModel.findOne.mockReturnValue(
      query({
        _id: JOB,
        ownerId: OWNER,
        description: 'Build reliable backend services.',
        responsibilities: ['Own APIs'],
        requirements: ['TypeScript'],
        skills: ['MongoDB'],
      }),
    );

    const duplicate = await service.assess(String(OWNER), String(APPLICANT));

    expect(duplicate).toEqual(expect.objectContaining({ status: 'RUNNING' }));
    expect(gateway.assess).not.toHaveBeenCalled();
    expect(applicantModel.updateOne).not.toHaveBeenCalled();
  });

  it('loses the atomic start race without dispatching a duplicate assessment', async () => {
    const winner = {
      ...linkedApplicant(),
      resumeAssessment: {
        status: 'RUNNING',
        runId: 'winning-run',
        pairKey:
          '8df66ac1432e54fadd1a96d19f53a4cbb5500b030a84a3491b630caea5e0fb93',
      },
    };
    applicantModel.findOne
      .mockReturnValueOnce(query(linkedApplicant()))
      .mockReturnValueOnce(query(winner));
    applicantModel.updateOne.mockReturnValueOnce(
      query({ acknowledged: true, modifiedCount: 0 }),
    );

    const result = await service.assess(String(OWNER), String(APPLICANT));

    expect(result).toEqual(winner.resumeAssessment);
    expect(gateway.assess).not.toHaveBeenCalled();
    expect(applicantModel.updateOne).toHaveBeenCalledTimes(1);
  });

  it('keeps the prior pair attributable when refreshing changed inputs', async () => {
    applicantModel.findOne.mockReturnValue(
      query({
        ...linkedApplicant(),
        resumeAssessment: {
          status: 'COMPLETE',
          runId: 'old-run',
          pairKey: 'old-pair',
          checkedAt: new Date('2026-09-01T00:00:00Z'),
          submittedResume: { artifactId: String(ARTIFACT), version: 6, hash: 'old-resume' },
          job: { jobId: String(JOB), descriptionHash: 'old-job', descriptionVersion: 1 },
          ats: { status: 'COMPLETE', semanticMatch: 75 },
          aiContent: { status: 'COMPLETE', composite: 30 },
        },
      }),
    );

    await service.assess(String(OWNER), String(APPLICANT));

    expect(applicantModel.updateOne.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        $push: {
          resumeAssessmentHistory: expect.objectContaining({
            runId: 'old-run',
            pairKey: 'old-pair',
            status: 'STALE',
            staleReason: 'ASSESSED_PAIR_CHANGED',
            staleAt: expect.any(Date),
          }),
        },
      }),
    );
  });
});
