import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ApplicationsService } from './applications.service';
import { Application } from '../schemas/application.schema';
import { User } from '../schemas/user.schema';
import { Job } from '../schemas/job.schema';
import { Resume } from '../schemas/resume.schema';
import { ApplicationEventsService } from './application-events.service';
import { EmployerPipelineService } from '../employer-pipeline/employer-pipeline.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AutopilotRulesService } from '../ai-recruiter/autopilot-rules.service';

const CAND = new Types.ObjectId().toHexString();
const OWNER = new Types.ObjectId().toHexString();
const JOBID = new Types.ObjectId().toHexString();
const EMPLOYER_JOB_ID = new Types.ObjectId().toHexString();

const findChain = (rows: any) => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(rows),
});

describe('ApplicationsService', () => {
  let service: ApplicationsService;

  const applicationModel: any = jest.fn();
  applicationModel.findOne = jest.fn();

  const jobModel = { findById: jest.fn() };
  const userModel = { findById: jest.fn() };
  const resumeModel = { find: jest.fn() };
  const applicationEventsService = { recordEvent: jest.fn().mockResolvedValue({}) };
  const employerPipelineService = {
    upsertApplicant: jest.fn().mockResolvedValue({ _id: 'app-1' }),
  };
  const notificationsService = { create: jest.fn().mockResolvedValue({}) };
  const autopilotRulesService = { evaluateApplicant: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: getModelToken(Application.name), useValue: applicationModel },
        { provide: getModelToken(Job.name), useValue: jobModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Resume.name), useValue: resumeModel },
        { provide: ApplicationEventsService, useValue: applicationEventsService },
        { provide: EmployerPipelineService, useValue: employerPipelineService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: AutopilotRulesService, useValue: autopilotRulesService },
      ],
    }).compile();

    service = moduleRef.get<ApplicationsService>(ApplicationsService);

    // default candidate profile resolution
    userModel.findById.mockReturnValue({
      lean: jest
        .fn()
        .mockResolvedValue({ name: 'Ada Lovelace', email: 'ada@x.com', location: 'London' }),
    });
    resumeModel.find.mockReturnValue(
      findChain([
        {
          isPrimary: true,
          headline: 'Staff Engineer',
          skills: ['ts', 'node'],
          experience: [{ title: 'Eng', startDate: '2018', endDate: '2022' }],
        },
      ]),
    );
  });

  afterEach(() => jest.clearAllMocks());

  const employerJob = {
    _id: JOBID,
    title: 'Backend Engineer',
    isExternal: false,
    externalId: `jobocate:${EMPLOYER_JOB_ID}`,
    source: 'Jobocate',
    addedBy: OWNER,
    sourceJobKey: EMPLOYER_JOB_ID,
  };
  const scrapedJob = {
    _id: JOBID,
    title: 'Scraped Role',
    isExternal: true,
    source: 'Greenhouse',
  };

  describe('bridgeApplicationToPipeline', () => {
    it('bridges an employer-posted job: resolves owner/employerJobId, populates candidate fields, upserts + notifies both sides', async () => {
      jobModel.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(employerJob) });

      await service.bridgeApplicationToPipeline({
        _id: 'a1',
        candidateId: CAND,
        jobId: JOBID,
        matchScore: 77,
      } as any);

      expect(employerPipelineService.upsertApplicant).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: OWNER,
          jobId: EMPLOYER_JOB_ID,
          candidateId: CAND,
          aiScore: 77,
          source: 'jobocate_apply',
          stage: 'applied',
          candidateName: 'Ada Lovelace',
          candidateEmail: 'ada@x.com',
          candidateHeadline: 'Staff Engineer',
          skills: ['ts', 'node'],
          yearsExperience: 4,
        }),
      );

      // candidate notification (applications) + employer notification (applicants)
      const audiences = notificationsService.create.mock.calls.map((c) => c[0]);
      expect(audiences).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ audience: 'candidate', type: 'applications' }),
          expect.objectContaining({ audience: 'employer', userId: OWNER, type: 'applicants' }),
        ]),
      );
    });

    it('SKIPS the employer pipeline for a purely-scraped job (candidate notif only, no upsert)', async () => {
      jobModel.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(scrapedJob) });

      await service.bridgeApplicationToPipeline({
        _id: 'a2',
        candidateId: CAND,
        jobId: JOBID,
        matchScore: 50,
      } as any);

      expect(employerPipelineService.upsertApplicant).not.toHaveBeenCalled();
      const audiences = notificationsService.create.mock.calls.map((c) => c[0].audience);
      expect(audiences).toEqual(['candidate']);
    });

    it('swallows errors and never throws (defensive)', async () => {
      jobModel.findById.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('db down')),
      });
      jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);

      await expect(
        service.bridgeApplicationToPipeline({ _id: 'a3', candidateId: CAND, jobId: JOBID } as any),
      ).resolves.toBeUndefined();
    });

    it('evaluates the applicant with AutopilotRulesService only when the applicant was newly created', async () => {
      jobModel.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(employerJob) });
      const sameInstant = new Date('2026-08-11T00:00:00.000Z');
      const newlyCreatedApplicant = {
        _id: 'app-new',
        createdAt: sameInstant,
        updatedAt: sameInstant,
      };
      employerPipelineService.upsertApplicant.mockResolvedValueOnce(newlyCreatedApplicant);

      await service.bridgeApplicationToPipeline({
        _id: 'a4',
        candidateId: CAND,
        jobId: JOBID,
        matchScore: 60,
      } as any);

      expect(autopilotRulesService.evaluateApplicant).toHaveBeenCalledTimes(1);
      expect(autopilotRulesService.evaluateApplicant).toHaveBeenCalledWith(
        OWNER,
        newlyCreatedApplicant,
      );
    });

    it('does not re-evaluate an applicant that already existed (re-apply / update path)', async () => {
      jobModel.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(employerJob) });
      const existingApplicant = {
        _id: 'app-existing',
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-11T00:00:00.000Z'),
      };
      employerPipelineService.upsertApplicant.mockResolvedValueOnce(existingApplicant);

      await service.bridgeApplicationToPipeline({
        _id: 'a5',
        candidateId: CAND,
        jobId: JOBID,
        matchScore: 60,
      } as any);

      expect(autopilotRulesService.evaluateApplicant).not.toHaveBeenCalled();
    });
  });

  describe('createApplication', () => {
    it('saves, records the event and invokes the bridge', async () => {
      applicationModel.findOne.mockResolvedValue(null);
      const saved = { _id: 's1', candidateId: CAND, jobId: JOBID };
      const save = jest.fn().mockResolvedValue(saved);
      applicationModel.mockImplementation((doc: any) => ({ ...doc, save }));
      const bridgeSpy = jest
        .spyOn(service, 'bridgeApplicationToPipeline')
        .mockResolvedValue(undefined);

      const result = await service.createApplication(CAND, JOBID);

      expect(save).toHaveBeenCalled();
      expect(applicationEventsService.recordEvent).toHaveBeenCalled();
      expect(bridgeSpy).toHaveBeenCalledWith(saved);
      expect(result).toBe(saved);
    });
  });

  describe('updateApplicationStatus', () => {
    it('updates status and fires a candidate applications notification', async () => {
      const save = jest.fn().mockResolvedValue({ _id: 'x', candidateId: CAND, status: 'reviewing' });
      applicationModel.findById = jest
        .fn()
        .mockResolvedValue({ _id: 'x', candidateId: CAND, status: 'pending', save });

      await service.updateApplicationStatus('x', 'reviewing');

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          audience: 'candidate',
          userId: CAND,
          type: 'applications',
        }),
      );
    });

    it('accepts "failed", stamps failReason, and stays SILENT (retryable, no notification)', async () => {
      const doc: any = { _id: 'x', candidateId: CAND, status: 'pending' };
      doc.save = jest.fn().mockResolvedValue(doc);
      applicationModel.findById = jest.fn().mockResolvedValue(doc);

      await service.updateApplicationStatus('x', 'failed', 'ATS timed out');

      expect(doc.status).toBe('failed');
      expect(doc.failReason).toBe('ATS timed out');
      expect(notificationsService.create).not.toHaveBeenCalled();
    });

    it('accepts "needs_human", stamps a default failReason, and notifies the candidate to act', async () => {
      const doc: any = { _id: 'x', candidateId: CAND, status: 'pending' };
      doc.save = jest.fn().mockResolvedValue(doc);
      applicationModel.findById = jest.fn().mockResolvedValue(doc);

      await service.updateApplicationStatus('x', 'needs_human');

      expect(doc.status).toBe('needs_human');
      expect(doc.failReason).toBeTruthy();
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ audience: 'candidate', userId: CAND, type: 'applications' }),
      );
    });

    it('rejects an invalid status', async () => {
      applicationModel.findById = jest
        .fn()
        .mockResolvedValue({ _id: 'x', candidateId: CAND, status: 'pending', save: jest.fn() });

      await expect(service.updateApplicationStatus('x', 'bogus')).rejects.toThrow(
        /Invalid status/,
      );
    });
  });
});
