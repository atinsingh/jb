import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bull';
import { BadRequestException } from '@nestjs/common';
import { ApplicationAgentService } from './application-agent.service';
import { AutoApplyProcessor } from './auto-apply.processor';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { ApplicationEventsService } from './application-events.service';
import { ApplyRunnerService } from '../apply-runner/apply-runner.service';
import { MatchingService } from '../matching/matching.service';
import { UserPreferencesService } from '../users/user-preferences.service';
import { Application } from '../schemas/application.schema';
import { User } from '../schemas/user.schema';
import { Job } from '../schemas/job.schema';
import { QUEUE_AUTO_APPLY, JOB_AUTO_APPLY } from '../queue/queue.constants';

const USER_ID = 'u1';
const JOB_IDS = ['j1', 'j2'];

// Constructor deps for ApplicationAgentService (mongoose models + collaborators).
const agentProviders = () => [
  { provide: getModelToken(Application.name), useValue: {} },
  { provide: getModelToken(User.name), useValue: {} },
  { provide: getModelToken(Job.name), useValue: {} },
  { provide: MatchingService, useValue: {} },
  { provide: UserPreferencesService, useValue: {} },
  { provide: ApplicationEventsService, useValue: {} },
  { provide: ApplicationsService, useValue: {} },
];

describe('ApplicationAgentService.requestAutoApply (producer: queue vs inline)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('enqueues one batch job and returns the jobId when a queue is present', async () => {
    // Presence of the queue provider flips the producer into "enqueue" mode
    // (mirrors QUEUE_ENABLED=true).
    const queue = { add: jest.fn().mockResolvedValue({ id: 'j1' }) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationAgentService,
        { provide: getQueueToken(QUEUE_AUTO_APPLY), useValue: queue },
        ...agentProviders(),
      ],
    }).compile();

    const service = moduleRef.get(ApplicationAgentService);
    // Guard: must NOT run the inline loop when queued.
    const inlineSpy = jest.spyOn(service, 'autoApply').mockResolvedValue([] as any);

    const result = await service.requestAutoApply(USER_ID, JOB_IDS);

    expect(queue.add).toHaveBeenCalledTimes(1);
    // One job per batch — the whole jobIds array in a single payload.
    expect(queue.add).toHaveBeenCalledWith(JOB_AUTO_APPLY, {
      userId: USER_ID,
      jobIds: JOB_IDS,
    });
    expect(inlineSpy).not.toHaveBeenCalled();
    expect(result).toEqual({
      queued: true,
      jobId: 'j1',
      message: 'Auto-application queued',
    });
  });

  it('runs autoApply inline when the queue is absent (dev/test default)', async () => {
    // No getQueueToken provider → @Optional() @InjectQueue resolves to undefined.
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [ApplicationAgentService, ...agentProviders()],
    }).compile();

    const service = moduleRef.get(ApplicationAgentService);
    const apps = [{ _id: 'a1' }, { _id: 'a2' }];
    const inlineSpy = jest.spyOn(service, 'autoApply').mockResolvedValue(apps as any);

    const result = await service.requestAutoApply(USER_ID, JOB_IDS);

    expect(inlineSpy).toHaveBeenCalledWith(USER_ID, JOB_IDS);
    expect(result).toEqual({
      queued: false,
      message: 'Auto-application completed',
      applications: apps,
      count: 2,
    });
  });
});

describe('ApplicationsController.autoApply (empty-jobIds guard)', () => {
  const buildController = (producerResult: any) => {
    const agent: any = {
      requestAutoApply: jest.fn().mockResolvedValue(producerResult),
    };
    const controller = new ApplicationsController(
      {} as ApplicationsService,
      agent as ApplicationAgentService,
      {} as ApplicationEventsService,
      {} as ApplyRunnerService,
    );
    return { controller, agent };
  };

  const req = { user: { _id: 'u1', email: 'u@x.com' } };

  it('400s on empty jobIds before touching the producer', async () => {
    const { controller, agent } = buildController(null);
    await expect(controller.autoApply([], req as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(controller.autoApply(undefined as any, req as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(agent.requestAutoApply).not.toHaveBeenCalled();
  });

  it('delegates to the producer and returns its result (queued path)', async () => {
    const queued = { queued: true, jobId: 'j1', message: 'Auto-application queued' };
    const { controller, agent } = buildController(queued);

    const result = await controller.autoApply(JOB_IDS, req as any);

    expect(agent.requestAutoApply).toHaveBeenCalledWith('u1', JOB_IDS);
    expect(result).toEqual(queued);
  });

  it('returns the inline shape unchanged when the producer runs inline', async () => {
    const inline = {
      queued: false,
      message: 'Auto-application completed',
      applications: [{ _id: 'a1' }],
      count: 1,
    };
    const { controller } = buildController(inline);

    const result = await controller.autoApply(JOB_IDS, req as any);

    expect(result).toEqual(inline);
  });
});

describe('AutoApplyProcessor', () => {
  it('calls autoApply with the job payload', async () => {
    const apps = [{ _id: 'a1' }];
    const service = {
      autoApply: jest.fn().mockResolvedValue(apps),
    } as unknown as ApplicationAgentService;

    const processor = new AutoApplyProcessor(service);
    const job: any = { id: 'j1', data: { userId: USER_ID, jobIds: JOB_IDS } };

    const result = await processor.handleAutoApply(job);

    expect(service.autoApply).toHaveBeenCalledWith(USER_ID, JOB_IDS);
    expect(result).toEqual(apps);
  });
});
