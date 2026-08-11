import { EligibleJobsService } from './eligible-jobs.service';
import { EligibilityService } from '../geography/eligibility.service';
import { JobGeoService } from '../geography/job-geo.service';
import { MatchScorerService } from './match-scorer.service';

const USER_ID = '507f1f77bcf86cd799439011';
const PROFILE_ID = '507f1f77bcf86cd799439012';

/**
 * Stage-1a is the indexed pre-filter that bounds the pool before any
 * per-job work. It used to key off the candidate's CURRENT country, which made
 * "I live in India but I'm looking for work in Canada" unexpressible. These
 * tests pin the query to the profile's TARGET countries instead.
 */
describe('EligibleJobsService — Stage-1a geo pre-filter', () => {
  let service: EligibleJobsService;
  let capturedQuery: any;
  let prefs: any;
  let profile: any;

  /** Chainable stub mimicking a mongoose query. */
  const chain = (result: any) => ({
    sort: () => ({ limit: () => ({ lean: () => Promise.resolve(result) }) }),
  });

  beforeEach(() => {
    capturedQuery = undefined;
    prefs = { country: 'IN' };
    profile = { targetCountries: ['CA'] };

    const jobModel: any = {
      find: jest.fn((q: any) => {
        capturedQuery = q;
        return chain([]);
      }),
    };
    const prefsModel: any = { findOne: () => ({ lean: () => Promise.resolve(prefs) }) };
    const resumeModel: any = { find: () => chain([]) };
    const profileModel: any = {
      findOne: jest.fn(() => ({ sort: () => ({ lean: () => Promise.resolve(profile) }) })),
    };

    service = new EligibleJobsService(
      jobModel,
      prefsModel,
      resumeModel,
      profileModel,
      new EligibilityService(),
      new JobGeoService(),
      new MatchScorerService(),
    );
  });

  /** Pull the geo `$or` branch out of the composed query. */
  const geoOr = (): any[] => {
    const and: any[] = capturedQuery?.$and || [];
    const branch = and.find((c) => Array.isArray(c?.$or));
    return branch?.$or || [];
  };

  // ------------------------------------------------------------ AC1.2 ----
  it('filters on the target countries, not the candidate current country', async () => {
    await service.getEligibleJobs(USER_ID);

    const or = geoOr();
    expect(or).toContainEqual({ country: { $in: ['CA'] } });
    expect(or).toContainEqual({ eligibleCountries: { $in: ['CA'] } });
    // The candidate's own country must not leak in as a filter.
    expect(JSON.stringify(or)).not.toContain('IN');
  });

  it('always admits genuinely global remote roles', async () => {
    await service.getEligibleJobs(USER_ID);

    expect(geoOr()).toContainEqual({ remoteScope: 'GLOBAL' });
  });

  it('supports multiple target countries', async () => {
    profile = { targetCountries: ['CA', 'US'] };
    await service.getEligibleJobs(USER_ID);

    expect(geoOr()).toContainEqual({ country: { $in: ['CA', 'US'] } });
  });

  // ------------------------------------------------------------ AC1.4 ----
  it('falls back to the current country when the profile states no target', async () => {
    profile = { targetCountries: [] };
    await service.getEligibleJobs(USER_ID);

    expect(geoOr()).toContainEqual({ country: { $in: ['IN'] } });
  });

  it('falls back to the current country when the candidate has no profile at all', async () => {
    profile = null;
    await service.getEligibleJobs(USER_ID);

    expect(geoOr()).toContainEqual({ country: { $in: ['IN'] } });
  });

  it('applies no geo filter when neither a target nor a current country exists', async () => {
    profile = null;
    prefs = {};
    await service.getEligibleJobs(USER_ID);

    expect(geoOr()).toEqual([]);
  });

  // ------------------------------------------------------------ S1.12 ----
  describe('remoteScope preference', () => {
    it('admits unscoped remote roles by default', async () => {
      await service.getEligibleJobs(USER_ID);

      expect(geoOr()).toContainEqual({
        workplaceType: 'REMOTE',
        remoteScope: { $in: [null, 'UNSPECIFIED'] },
      });
    });

    it('excludes unscoped remote roles when the candidate restricts to selected countries', async () => {
      prefs = { country: 'IN', remoteScope: 'selected_countries' };
      await service.getEligibleJobs(USER_ID);

      expect(geoOr()).not.toContainEqual({
        workplaceType: 'REMOTE',
        remoteScope: { $in: [null, 'UNSPECIFIED'] },
      });
    });
  });

  describe('relocation', () => {
    it('opens on-site roles anywhere only when both relocation flags are set', async () => {
      prefs = { country: 'IN', willingToRelocate: true, internationalRelocation: true };
      await service.getEligibleJobs(USER_ID);

      expect(geoOr()).toContainEqual({ workplaceType: { $in: ['ONSITE', 'HYBRID'] } });
    });

    it('does not open them for relocation within a country alone', async () => {
      prefs = { country: 'IN', willingToRelocate: true, internationalRelocation: false };
      await service.getEligibleJobs(USER_ID);

      expect(geoOr()).not.toContainEqual({ workplaceType: { $in: ['ONSITE', 'HYBRID'] } });
    });
  });

  describe('profile selection', () => {
    it('uses the named profile when a profileId is supplied', async () => {
      const profileModel: any = (service as any).profileModel;
      await service.getEligibleJobs(USER_ID, { profileId: PROFILE_ID });

      const query = profileModel.findOne.mock.calls[0][0];
      expect(String(query._id)).toBe(PROFILE_ID);
      expect(query.active).toBeUndefined();
    });

    it('falls back to the active profile when none is named', async () => {
      const profileModel: any = (service as any).profileModel;
      await service.getEligibleJobs(USER_ID);

      expect(profileModel.findOne.mock.calls[0][0].active).toBe(true);
    });

    it('ignores a malformed profileId and uses the active profile', async () => {
      const profileModel: any = (service as any).profileModel;
      await service.getEligibleJobs(USER_ID, { profileId: 'not-an-objectid' });

      expect(profileModel.findOne.mock.calls[0][0].active).toBe(true);
    });
  });

  it('reports the resolved targets so the empty state can explain itself', async () => {
    const res: any = await service.getEligibleJobs(USER_ID);

    expect(res.targetCountries).toEqual(['CA']);
    expect(res.hasTargetCountries).toBe(true);
  });

  // -------------------------------------------------------------------------
  // The job profile is where a candidate states, per search, what they want to
  // be matched on. It used to contribute ONLY its target countries: skills,
  // role and minMatchScore were stored, shown in the UI, and never read. A
  // candidate whose résumé had no parsed skills therefore scored as a zero-skill
  // candidate, every job landed near the floor, and the whole pool fell below
  // the recommendation threshold — an empty screen that blamed the job market.
  // -------------------------------------------------------------------------
  describe('the job profile drives scoring, not just geography', () => {
    it('counts the profile skills the candidate entered', async () => {
      profile = { targetCountries: ['CA'], skills: ['typescript', 'postgres', 'kubernetes'] };

      const res: any = await service.getEligibleJobs(USER_ID);

      expect(res.candidateSkillCount).toBe(3);
    });

    it('still counts résumé skills, and merges both without double-counting', async () => {
      profile = { targetCountries: ['CA'], skills: ['typescript', 'postgres'] };
      (service as any).resumeModel.find = () =>
        chain([{ skills: ['typescript', 'graphql'], headline: 'Staff Engineer' }]);

      const res: any = await service.getEligibleJobs(USER_ID);

      // typescript appears in both sources but is one skill.
      expect(res.candidateSkillCount).toBe(3);
    });

    it('falls back to the profile role when no résumé supplies a headline', async () => {
      profile = { targetCountries: ['CA'], role: 'Senior Backend Engineer' };

      const cand = await (service as any).scoreProfile(USER_ID, prefs, profile);

      expect(cand.title).toBe('Senior Backend Engineer');
    });

    it('does not let the profile role override a résumé headline', async () => {
      profile = { targetCountries: ['CA'], role: 'Senior Backend Engineer' };
      (service as any).resumeModel.find = () => chain([{ skills: [], headline: 'Staff Engineer' }]);

      const cand = await (service as any).scoreProfile(USER_ID, prefs, profile);

      expect(cand.title).toBe('Staff Engineer');
    });

    it('survives a profile that has no skills at all', async () => {
      profile = { targetCountries: ['CA'] };

      const res: any = await service.getEligibleJobs(USER_ID);

      expect(res.candidateSkillCount).toBe(0);
    });
  });

  describe('match threshold', () => {
    it("obeys the profile's own minMatchScore over the global preference", () => {
      const pref = (service as any).buildPrefFilter(
        { minMatchScore: 60 },
        { minMatchScore: 75 },
      );

      expect(pref.minMatch).toBe(75);
    });

    it('falls back to the global preference when the profile sets none', () => {
      const pref = (service as any).buildPrefFilter({ minMatchScore: 60 }, {});

      expect(pref.minMatch).toBe(60);
    });

    it('treats a profile threshold of 0 as "show me everything", not as unset', () => {
      const pref = (service as any).buildPrefFilter(
        { minMatchScore: 60 },
        { minMatchScore: 0 },
      );

      expect(pref.minMatch).toBe(0);
    });
  });
});
