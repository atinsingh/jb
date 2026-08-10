import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ApplicationAgentService } from './application-agent.service';
import { Application } from '../schemas/application.schema';
import { User } from '../schemas/user.schema';
import { Job } from '../schemas/job.schema';
import { MatchingService } from '../matching/matching.service';
import { UserPreferencesService } from '../users/user-preferences.service';
import { ApplicationEventsService } from './application-events.service';
import { ApplicationsService } from './applications.service';

describe('ApplicationAgentService.autoApply (bridge seam)', () => {
  let service: ApplicationAgentService;

  const savedDoc = { _id: 's1', candidateId: 'u1', jobId: 'j1' };
  const save = jest.fn().mockResolvedValue(savedDoc);
  const applicationModel: any = jest.fn().mockImplementation((doc: any) => ({ ...doc, save }));
  applicationModel.findOne = jest.fn().mockResolvedValue(null);
  applicationModel.countDocuments = jest.fn().mockResolvedValue(0);

  const userModel = { findById: jest.fn().mockResolvedValue({ _id: 'u1', email: 'u@x.com' }) };
  const jobModel = {
    findById: jest.fn().mockResolvedValue({ _id: 'j1', title: 'Eng', companyName: 'Acme' }),
  };
  const matchingService = {
    calculateMatch: jest.fn().mockResolvedValue({ matchScore: 92, reasoning: 'ok' }),
    generateCoverLetter: jest.fn().mockResolvedValue('cover'),
  };
  const userPreferencesService = { getOrCreate: jest.fn().mockResolvedValue({}) };
  const applicationEventsService = { recordEvent: jest.fn().mockResolvedValue({}) };
  const applicationsService = {
    bridgeApplicationToPipeline: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    process.env.AUTO_APPLICATION_ENABLED = 'true';

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationAgentService,
        { provide: getModelToken(Application.name), useValue: applicationModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Job.name), useValue: jobModel },
        { provide: MatchingService, useValue: matchingService },
        { provide: UserPreferencesService, useValue: userPreferencesService },
        { provide: ApplicationEventsService, useValue: applicationEventsService },
        { provide: ApplicationsService, useValue: applicationsService },
      ],
    }).compile();

    service = moduleRef.get<ApplicationAgentService>(ApplicationAgentService);
  });

  afterEach(() => jest.clearAllMocks());

  it('invokes the pipeline bridge with the saved application for each auto-applied job', async () => {
    const result = await service.autoApply('u1', ['j1']);

    expect(save).toHaveBeenCalled();
    expect(applicationsService.bridgeApplicationToPipeline).toHaveBeenCalledWith(savedDoc);
    expect(result).toHaveLength(1);
  });
});
