import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AgentsService } from './agents.service';
import { User } from '../schemas/user.schema';
import { JobMatch } from '../schemas/job-match.schema';
import { Application } from '../schemas/application.schema';
import { JobProfile } from '../schemas/job-profile.schema';
import { ApplicationsService } from '../applications/applications.service';
import { MatchingService } from '../matching/matching.service';
import { AppLoggerService } from '../common/logger/logger.service';
import { StorageService } from '../storage';

describe('AgentsService.uploadProof (storage migration)', () => {
  let service: AgentsService;

  const storage = {
    put: jest.fn(),
    getBuffer: jest.fn(),
    delete: jest.fn(),
    getSignedUrl: jest.fn(),
    getDriverName: jest.fn(() => 'local'),
  };

  const applicationModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const logger = {
    setContext: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const buildApp = () => ({
    _id: 'app1',
    agentId: { toString: () => 'agent1' },
    proofDocuments: [],
  });
  const file = { originalname: 'proof.png', buffer: Buffer.from('img') } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    storage.getDriverName.mockReturnValue('local');
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        { provide: getModelToken(User.name), useValue: {} },
        { provide: getModelToken(JobMatch.name), useValue: {} },
        { provide: getModelToken(Application.name), useValue: applicationModel },
        { provide: getModelToken(JobProfile.name), useValue: {} },
        { provide: ApplicationsService, useValue: {} },
        { provide: MatchingService, useValue: {} },
        { provide: AppLoggerService, useValue: logger },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = moduleRef.get<AgentsService>(AgentsService);
  });

  it('puts each file under proof/<applicationId>/... and stores the served url (local)', async () => {
    applicationModel.findById.mockResolvedValue(buildApp());
    applicationModel.findByIdAndUpdate.mockResolvedValue({ _id: 'app1' });
    storage.put.mockResolvedValue({ key: 'k', url: '/uploads/proof/x.png' });

    await service.uploadProof('app1', 'agent1', [file]);

    expect(storage.put).toHaveBeenCalledTimes(1);
    const [putKey, buf] = storage.put.mock.calls[0];
    expect(putKey).toMatch(/^proof\/app1\/\d+-proof\.png$/);
    expect(buf).toBe(file.buffer);
    expect(storage.getSignedUrl).not.toHaveBeenCalled();

    const [, update] = applicationModel.findByIdAndUpdate.mock.calls[0];
    expect(update.$set.proofDocuments).toEqual(['/uploads/proof/x.png']);
    expect(update.$set.proofSubmittedAt).toBeInstanceOf(Date);
  });

  it('stores a signed url instead of the raw url when the driver is s3', async () => {
    storage.getDriverName.mockReturnValue('s3');
    applicationModel.findById.mockResolvedValue(buildApp());
    applicationModel.findByIdAndUpdate.mockResolvedValue({ _id: 'app1' });
    storage.put.mockResolvedValue({ key: 'proof/app1/1-proof.png', url: 's3://raw' });
    storage.getSignedUrl.mockResolvedValue('https://signed.example/proof.png');

    await service.uploadProof('app1', 'agent1', [file]);

    const putKey = storage.put.mock.calls[0][0];
    expect(storage.getSignedUrl).toHaveBeenCalledWith(putKey);
    const [, update] = applicationModel.findByIdAndUpdate.mock.calls[0];
    expect(update.$set.proofDocuments).toEqual([
      'https://signed.example/proof.png',
    ]);
  });
});
