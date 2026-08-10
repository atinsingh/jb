import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EmployerOffersService } from './employer-offers.service';
import { EmployerOffer } from './schemas/employer-offer.schema';
import { EmployerApplicant } from '../employer-pipeline/schemas/employer-applicant.schema';
import { NotificationsService } from '../notifications/notifications.service';

const OWNER = 'owner-1';
const CAND = 'cand-1';
const APPLICANT = 'applicant-1';

describe('EmployerOffersService (notification producers)', () => {
  let service: EmployerOffersService;

  const saved: any = { _id: 'o1', ownerId: OWNER, candidateName: 'Ada', status: 'draft' };
  const save = jest.fn().mockResolvedValue(saved);
  const employerOfferModel: any = jest.fn().mockImplementation((doc: any) => ({ ...doc, save }));
  employerOfferModel.findOne = jest.fn();

  // Chainable findById(...).exec() applicant model mock.
  const applicantExec = jest.fn().mockResolvedValue(null);
  const employerApplicantModel: any = {
    findById: jest.fn().mockReturnValue({ exec: applicantExec }),
  };

  const notificationsService = { create: jest.fn().mockResolvedValue({}) };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        EmployerOffersService,
        { provide: getModelToken(EmployerOffer.name), useValue: employerOfferModel },
        { provide: getModelToken(EmployerApplicant.name), useValue: employerApplicantModel },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = moduleRef.get<EmployerOffersService>(EmployerOffersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    applicantExec.mockResolvedValue(null);
    employerApplicantModel.findById.mockReturnValue({ exec: applicantExec });
    save.mockResolvedValue(saved);
  });

  it('fires an employer "offers" notification on create', async () => {
    await service.create(OWNER, { candidateName: 'Ada' } as any);

    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'employer', userId: OWNER, type: 'offers' }),
    );
  });

  it('does NOT notify the candidate when there is no applicant/candidateId', async () => {
    await service.create(OWNER, { candidateName: 'Ada' } as any);

    const audiences = notificationsService.create.mock.calls.map((c) => c[0].audience);
    expect(audiences).toContain('employer');
    expect(audiences).not.toContain('candidate');
  });

  it('copies candidateId from the linked applicant and notifies the candidate', async () => {
    // Applicant lookup resolves the real candidate (User) id.
    applicantExec.mockResolvedValueOnce({ _id: APPLICANT, candidateId: CAND });
    // Persisted doc carries candidateId so notifyOffer fires the candidate branch.
    save.mockResolvedValueOnce({ ...saved, candidateId: CAND });

    await service.create(OWNER, { candidateName: 'Ada', applicantId: APPLICANT } as any);

    // The applicant was looked up by id.
    expect(employerApplicantModel.findById).toHaveBeenCalledWith(APPLICANT);
    // The new offer doc was constructed with the resolved candidateId.
    expect(employerOfferModel).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: OWNER, candidateId: CAND }),
    );

    const calls = notificationsService.create.mock.calls.map((c) => c[0]);
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ audience: 'employer', type: 'offers' }),
        expect.objectContaining({ audience: 'candidate', userId: CAND, type: 'applications' }),
      ]),
    );
  });

  it('does not throw and leaves candidateId unset when the applicant is missing', async () => {
    // findById resolves null (applicant not found).
    applicantExec.mockResolvedValueOnce(null);

    await expect(
      service.create(OWNER, { candidateName: 'Ada', applicantId: APPLICANT } as any),
    ).resolves.toBe(saved);

    // Doc was built WITHOUT a candidateId.
    expect(employerOfferModel).toHaveBeenCalledWith(
      expect.not.objectContaining({ candidateId: expect.anything() }),
    );
    const audiences = notificationsService.create.mock.calls.map((c) => c[0].audience);
    expect(audiences).not.toContain('candidate');
  });

  it('fires an employer "offers" notification on updateStatus', async () => {
    const offer: any = { _id: 'o1', ownerId: OWNER, status: 'draft', save: jest.fn() };
    offer.save.mockResolvedValue({ ...offer, status: 'sent' });
    employerOfferModel.findOne.mockResolvedValue(offer);

    await service.updateStatus(OWNER, 'o1', 'sent');

    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'employer', type: 'offers' }),
    );
  });

  it('swallows a notification error and still returns the saved offer', async () => {
    notificationsService.create.mockRejectedValueOnce(new Error('notif down'));

    await expect(
      service.create(OWNER, { candidateName: 'Ada' } as any),
    ).resolves.toBe(saved);
  });
});
