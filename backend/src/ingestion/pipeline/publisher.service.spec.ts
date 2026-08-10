import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PublisherService } from './publisher.service';
import { Job } from '../../schemas/job.schema';

describe('PublisherService.publishEmployerJob', () => {
  let service: PublisherService;

  const jobModel = {
    findOneAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PublisherService,
        { provide: getModelToken(Job.name), useValue: jobModel },
      ],
    }).compile();

    service = moduleRef.get<PublisherService>(PublisherService);
    jobModel.findOneAndUpdate.mockResolvedValue({ _id: 'job-1' });
  });

  afterEach(() => jest.clearAllMocks());

  const setOf = () => jobModel.findOneAndUpdate.mock.calls[0][1].$set;
  const filterOf = () => jobModel.findOneAndUpdate.mock.calls[0][0];

  it('writes UPPERCASE workplaceType REMOTE for a remote employer job (matching engine expects uppercase)', async () => {
    await service.publishEmployerJob({
      _id: 'e1',
      title: 'Staff Engineer',
      isRemote: true,
      status: 'active',
    });

    const set = setOf();
    expect(set.workplaceType).toBe('REMOTE');
    expect(set.isRemote).toBe(true);
  });

  it('writes UPPERCASE workplaceType ONSITE for a non-remote employer job', async () => {
    await service.publishEmployerJob({
      _id: 'e2',
      title: 'Office Manager',
      isRemote: false,
      status: 'active',
    });

    expect(setOf().workplaceType).toBe('ONSITE');
  });

  it('upserts by synthetic externalId jobocate:<id> and marks first-party invariants', async () => {
    await service.publishEmployerJob({
      _id: 'e3',
      title: 'PM',
      companyName: 'Acme',
      status: 'active',
    });

    expect(filterOf()).toEqual({ externalId: 'jobocate:e3' });
    const set = setOf();
    expect(set.source).toBe('Jobocate');
    expect(set.importMethod).toBe('employer_direct');
    expect(set.isExternal).toBe(false);
    expect(set.verifiedEmployer).toBe(true);
    expect(set.sourceJobKey).toBe('e3');
  });

  it('publishes as lifecycle=published / isActive=true when status is active', async () => {
    const out = await service.publishEmployerJob({
      _id: 'e4',
      title: 'Role',
      status: 'active',
    });

    expect(setOf().lifecycle).toBe('published');
    expect(setOf().isActive).toBe(true);
    expect(out.lifecycle).toBe('published');
  });

  it('re-publishes as lifecycle=paused / isActive=false when status is not active', async () => {
    const out = await service.publishEmployerJob({
      _id: 'e5',
      title: 'Role',
      status: 'paused',
    });

    expect(setOf().lifecycle).toBe('paused');
    expect(setOf().isActive).toBe(false);
    expect(out.lifecycle).toBe('paused');
  });
});
