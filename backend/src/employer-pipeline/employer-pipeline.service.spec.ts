import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { EmployerPipelineService } from './employer-pipeline.service';
import { EmployerApplicant } from './schemas/employer-applicant.schema';
import { NotificationsService } from '../notifications/notifications.service';

const OWNER = new Types.ObjectId().toHexString();
const JOB = new Types.ObjectId().toHexString();
const CAND = new Types.ObjectId().toHexString();

const query = (rows: any) => ({
  sort: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(rows),
});

describe('EmployerPipelineService', () => {
  let service: EmployerPipelineService;

  const applicantModel: any = {
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
  };
  const notificationsService = { create: jest.fn().mockResolvedValue({}) };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        EmployerPipelineService,
        { provide: getModelToken(EmployerApplicant.name), useValue: applicantModel },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = moduleRef.get<EmployerPipelineService>(EmployerPipelineService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('upsertApplicant', () => {
    it('upserts keyed on (jobId, candidateId) with $setOnInsert defaults and $set refresh fields', async () => {
      applicantModel.findOneAndUpdate.mockResolvedValue({ _id: 'a1' });

      const result = await service.upsertApplicant({
        ownerId: OWNER,
        jobId: JOB,
        candidateId: CAND,
        candidateName: 'Ada',
        candidateEmail: 'ada@x.com',
        skills: ['ts'],
        yearsExperience: 4,
        aiScore: 88,
      });

      const [filter, update, opts] = applicantModel.findOneAndUpdate.mock.calls[0];
      expect(filter.jobId).toBeInstanceOf(Types.ObjectId);
      expect(String(filter.jobId)).toBe(JOB);
      expect(String(filter.candidateId)).toBe(CAND);

      // insert-only defaults
      expect(update.$setOnInsert.stage).toBe('applied');
      expect(update.$setOnInsert.source).toBe('jobocate_apply');
      expect(String(update.$setOnInsert.ownerId)).toBe(OWNER);
      expect(update.$setOnInsert.appliedAt).toBeInstanceOf(Date);

      // refresh-on-every-write fields
      expect(update.$set.candidateName).toBe('Ada');
      expect(update.$set.skills).toEqual(['ts']);
      expect(update.$set.aiScore).toBe(88);

      expect(opts).toEqual(
        expect.objectContaining({ upsert: true, new: true }),
      );
      expect(result).toEqual({ _id: 'a1' });
    });

    it('defaults source/stage/aiScore when omitted', async () => {
      applicantModel.findOneAndUpdate.mockResolvedValue({ _id: 'a2' });

      await service.upsertApplicant({ jobId: JOB, candidateId: CAND });

      const update = applicantModel.findOneAndUpdate.mock.calls[0][1];
      expect(update.$setOnInsert.stage).toBe('applied');
      expect(update.$setOnInsert.source).toBe('jobocate_apply');
      expect(update.$set.aiScore).toBe(0);
    });
  });

  describe('updateStage', () => {
    it('saves the new stage and fires an employer applicants notification', async () => {
      const save = jest.fn().mockResolvedValue({
        ownerId: OWNER,
        candidateName: 'Ada',
        stage: 'interview',
      });
      applicantModel.findOne.mockReturnValue(
        query({ ownerId: OWNER, candidateName: 'Ada', save }),
      );

      await service.updateStage(OWNER, 'a1', 'interview');

      expect(save).toHaveBeenCalled();
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          audience: 'employer',
          userId: OWNER,
          type: 'applicants',
        }),
      );
    });
  });
});
