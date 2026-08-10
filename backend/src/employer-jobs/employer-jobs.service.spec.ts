import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EmployerJobsService } from './employer-jobs.service';
import { EmployerJob } from './schemas/employer-job.schema';
import { PublisherService } from '../ingestion/pipeline/publisher.service';

describe('EmployerJobsService (search bridge)', () => {
  let service: EmployerJobsService;

  // `new this.employerJobModel(doc)` must return an object with a save() that
  // resolves to a saved doc — so the model mock is a constructor function.
  const savedDoc = { _id: 'job-1', title: 'Eng', status: 'active' };
  const save = jest.fn().mockResolvedValue(savedDoc);
  const employerJobModel: any = jest.fn().mockImplementation((doc: any) => ({
    ...doc,
    save,
  }));
  employerJobModel.findOneAndUpdate = jest.fn();

  const publisherService = {
    publishEmployerJob: jest.fn().mockResolvedValue({ jobId: 'j1' }),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        EmployerJobsService,
        { provide: getModelToken(EmployerJob.name), useValue: employerJobModel },
        { provide: PublisherService, useValue: publisherService },
      ],
    }).compile();

    service = moduleRef.get<EmployerJobsService>(EmployerJobsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('publishes to search after create', async () => {
    const result = await service.create('owner1', { title: 'Eng' } as any);

    expect(save).toHaveBeenCalled();
    expect(publisherService.publishEmployerJob).toHaveBeenCalledWith(savedDoc);
    expect(result).toBe(savedDoc);
  });

  it('re-publishes the updated doc (active state carried through) after update', async () => {
    const updated = { _id: 'job-1', title: 'Eng II', status: 'active' };
    employerJobModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(updated),
    });

    await service.update('owner1', 'job-1', { title: 'Eng II' } as any);

    expect(publisherService.publishEmployerJob).toHaveBeenCalledWith(updated);
  });

  it('re-publishes with paused state when status changes to paused', async () => {
    const paused = { _id: 'job-1', title: 'Eng', status: 'paused' };
    employerJobModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(paused),
    });

    await service.updateStatus('owner1', 'job-1', 'paused');

    expect(publisherService.publishEmployerJob).toHaveBeenCalledWith(paused);
    expect(publisherService.publishEmployerJob.mock.calls[0][0].status).toBe(
      'paused',
    );
  });

  it('does not fail the save when the publisher throws (defensive)', async () => {
    publisherService.publishEmployerJob.mockRejectedValueOnce(
      new Error('publish down'),
    );

    await expect(
      service.create('owner1', { title: 'Eng' } as any),
    ).resolves.toBe(savedDoc);
  });
});
