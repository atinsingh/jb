import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EmployerInterviewsService } from './employer-interviews.service';
import { EmployerInterview } from './schemas/employer-interview.schema';
import { EmployerApplicant } from '../employer-pipeline/schemas/employer-applicant.schema';
import { NotificationsService } from '../notifications/notifications.service';

const OWNER = 'owner-1';
const CAND = 'cand-1';
const APPLICANT = 'applicant-1';

describe('EmployerInterviewsService (notification producers)', () => {
  let service: EmployerInterviewsService;

  const saved: any = { _id: 'i1', ownerId: OWNER, candidateName: 'Ada', status: 'scheduled' };
  const save = jest.fn().mockResolvedValue(saved);
  const interviewModel: any = jest.fn().mockImplementation((doc: any) => ({ ...doc, save }));
  interviewModel.findOne = jest.fn();

  // Chainable findById(...).exec() applicant model mock.
  const applicantExec = jest.fn().mockResolvedValue(null);
  const employerApplicantModel: any = {
    findById: jest.fn().mockReturnValue({ exec: applicantExec }),
  };

  const notificationsService = { create: jest.fn().mockResolvedValue({}) };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        EmployerInterviewsService,
        { provide: getModelToken(EmployerInterview.name), useValue: interviewModel },
        { provide: getModelToken(EmployerApplicant.name), useValue: employerApplicantModel },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = moduleRef.get<EmployerInterviewsService>(EmployerInterviewsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    applicantExec.mockResolvedValue(null);
    employerApplicantModel.findById.mockReturnValue({ exec: applicantExec });
    save.mockResolvedValue(saved);
  });

  it('fires an employer "interviews" notification when an interview is scheduled', async () => {
    await service.create(OWNER, { candidateName: 'Ada' } as any);

    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'employer', userId: OWNER, type: 'interviews' }),
    );
  });

  it('does NOT notify the candidate when there is no applicant/candidateId', async () => {
    await service.create(OWNER, { candidateName: 'Ada' } as any);

    const audiences = notificationsService.create.mock.calls.map((c) => c[0].audience);
    expect(audiences).toContain('employer');
    expect(audiences).not.toContain('candidate');
  });

  it('copies candidateId from the linked applicant and notifies the candidate', async () => {
    applicantExec.mockResolvedValueOnce({ _id: APPLICANT, candidateId: CAND });
    save.mockResolvedValueOnce({ ...saved, candidateId: CAND });

    await service.create(OWNER, { candidateName: 'Ada', applicantId: APPLICANT } as any);

    expect(employerApplicantModel.findById).toHaveBeenCalledWith(APPLICANT);
    expect(interviewModel).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: OWNER, candidateId: CAND }),
    );

    const calls = notificationsService.create.mock.calls.map((c) => c[0]);
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ audience: 'employer', type: 'interviews' }),
        expect.objectContaining({ audience: 'candidate', userId: CAND, type: 'applications' }),
      ]),
    );
  });

  it('does not throw and leaves candidateId unset when the applicant is missing', async () => {
    applicantExec.mockResolvedValueOnce(null);

    await expect(
      service.create(OWNER, { candidateName: 'Ada', applicantId: APPLICANT } as any),
    ).resolves.toBe(saved);

    expect(interviewModel).toHaveBeenCalledWith(
      expect.not.objectContaining({ candidateId: expect.anything() }),
    );
    const audiences = notificationsService.create.mock.calls.map((c) => c[0].audience);
    expect(audiences).not.toContain('candidate');
  });

  it('fires a notification on update', async () => {
    const doc: any = { _id: 'i1', ownerId: OWNER, save: jest.fn() };
    doc.save.mockResolvedValue({ ...doc, status: 'completed' });
    interviewModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });

    await service.update(OWNER, 'i1', { status: 'completed' } as any);

    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'employer', type: 'interviews' }),
    );
  });

  it('swallows a notification error and still returns the saved interview', async () => {
    notificationsService.create.mockRejectedValueOnce(new Error('notif down'));

    await expect(service.create(OWNER, { candidateName: 'Ada' } as any)).resolves.toBe(saved);
  });
});
