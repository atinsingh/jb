import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PublisherService } from './publisher.service';
import { Job } from '../../schemas/job.schema';
import { JobGeoService } from '../../geography/job-geo.service';

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
        // The REAL geography engine, not a stub. It is deterministic and has no
        // dependencies, and the bug these tests guard against was precisely that
        // the bridge never ran it — a stub would let that regress unnoticed.
        JobGeoService,
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

  it('writes UPPERCASE workplaceType ONSITE for a non-remote employer job with a location', async () => {
    await service.publishEmployerJob({
      _id: 'e2',
      title: 'Office Manager',
      location: 'Austin, Texas, United States',
      isRemote: false,
      status: 'active',
    });

    expect(setOf().workplaceType).toBe('ONSITE');
  });

  // This expectation was deliberately changed. It previously asserted ONSITE for
  // a job with NO location, on the reasoning that "not remote" implies onsite.
  // That inference is unsound and was harmful: ONSITE with a null country is the
  // one state the matcher's Stage-1a pre-filter drops, so a locationless
  // employer job disappeared from search. UNSPECIFIED keeps it discoverable via
  // the pre-filter's escape hatch for un-normalized rows.
  it('leaves workplaceType UNSPECIFIED when a non-remote job gives no location, so it stays discoverable', async () => {
    await service.publishEmployerJob({
      _id: 'e2b',
      title: 'Office Manager',
      isRemote: false,
      status: 'active',
    });

    expect(setOf().workplaceType).toBe('UNSPECIFIED');
    expect(setOf().country).toBeNull();
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

  // -------------------------------------------------------------------------
  // Geography. The bridge used to write `workplaceType` while leaving `country`
  // unset, which is the single combination the matcher's Stage-1a pre-filter
  // rejects: its escape hatch for un-normalized rows requires country AND
  // workplaceType to both be absent. A job an employer posted in Toronto was
  // therefore invisible to every candidate targeting Canada.
  // -------------------------------------------------------------------------
  describe('geography normalization (employer -> search bridge)', () => {
    it('derives country from the location an employer typed', async () => {
      await service.publishEmployerJob({
        _id: 'g1',
        title: 'Senior Backend Engineer',
        location: 'Toronto, Ontario, Canada',
        isRemote: false,
        status: 'active',
      });

      const set = setOf();
      expect(set.country).toBe('CA');
      expect(set.workplaceType).toBe('ONSITE');
    });

    it('never leaves country unset while workplaceType is set — the state the matcher drops', async () => {
      await service.publishEmployerJob({
        _id: 'g2',
        title: 'Senior Backend Engineer',
        location: 'Toronto, Ontario, Canada',
        isRemote: false,
        status: 'active',
      });

      const set = setOf();
      const strandedByPreFilter =
        !set.country &&
        !!set.workplaceType &&
        set.workplaceType !== 'UNSPECIFIED' &&
        !(set.eligibleCountries || []).length &&
        set.remoteScope !== 'GLOBAL';

      expect(strandedByPreFilter).toBe(false);
    });

    it('writes the full geography field set the matcher filters on', async () => {
      await service.publishEmployerJob({
        _id: 'g3',
        title: 'Engineer',
        location: 'Berlin, Germany',
        status: 'active',
      });

      const set = setOf();
      expect(set).toEqual(
        expect.objectContaining({
          country: 'DE',
          region: expect.anything(),
          remoteScope: expect.any(String),
          eligibleCountries: expect.any(Array),
          excludedCountries: expect.any(Array),
          locationConfidence: expect.any(Number),
          needsGeoReview: expect.any(Boolean),
        }),
      );
    });

    it('lets an explicit isRemote flag win over the location text', async () => {
      await service.publishEmployerJob({
        _id: 'g4',
        title: 'Engineer',
        location: 'Toronto, Ontario, Canada',
        isRemote: true,
        status: 'active',
      });

      expect(setOf().workplaceType).toBe('REMOTE');
      // Still anchored to a country — remote does not mean "anywhere".
      expect(setOf().country).toBe('CA');
    });

    it('flags a job for geo review rather than guessing when the location is unusable', async () => {
      await service.publishEmployerJob({
        _id: 'g5',
        title: 'Engineer',
        location: '',
        status: 'active',
      });

      const set = setOf();
      expect(set.country).toBeNull();
      // With no country AND no workplace type, the pre-filter's legacy escape
      // hatch still lets this through instead of silently dropping it.
      expect(set.workplaceType).toBe('UNSPECIFIED');
    });
  });
});
