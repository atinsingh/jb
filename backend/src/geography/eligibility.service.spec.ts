import { EligibilityService, CandidateEligibilityProfile, JobEligibilityInput } from './eligibility.service';
import {
  EligibilityStatus,
  ReasonCode,
  RemoteScope,
  SponsorshipPolicy,
  WorkplaceType,
} from './geo.constants';

/**
 * Geography is a HARD gate: it decides what a candidate is shown and, more
 * importantly, what auto-apply is allowed to submit on their behalf.
 *
 * The distinction under test throughout: where the candidate IS (`country`),
 * where they MAY work (`workAuthCountries`), and where they WANT to work
 * (`targetCountries`) are three different things.
 */
describe('EligibilityService — target countries', () => {
  let service: EligibilityService;

  beforeEach(() => {
    service = new EligibilityService();
  });

  const candidate = (over: Partial<CandidateEligibilityProfile> = {}): CandidateEligibilityProfile => ({
    country: 'IN',
    region: null,
    willingToRelocate: false,
    internationalRelocation: false,
    needsSponsorship: false,
    workAuthCountries: [],
    remoteOnly: false,
    targetCountries: [],
    ...over,
  });

  const onsiteIn = (country: string, over: Partial<JobEligibilityInput> = {}): JobEligibilityInput => ({
    isActive: true,
    country,
    region: null,
    workplaceType: WorkplaceType.ONSITE,
    remoteScope: RemoteScope.UNSPECIFIED,
    eligibleCountries: [],
    excludedCountries: [],
    sponsorship: SponsorshipPolicy.NOT_SPECIFIED,
    locationConfidence: 0.85,
    needsGeoReview: false,
    ...over,
  });

  const remoteScopedTo = (countries: string[], over: Partial<JobEligibilityInput> = {}): JobEligibilityInput => ({
    isActive: true,
    country: countries[0] || null,
    region: null,
    workplaceType: WorkplaceType.REMOTE,
    remoteScope: RemoteScope.COUNTRY_ONLY,
    eligibleCountries: countries,
    excludedCountries: [],
    sponsorship: SponsorshipPolicy.NOT_SPECIFIED,
    locationConfidence: 0.85,
    needsGeoReview: false,
    ...over,
  });

  // ------------------------------------------------------------ AC1.3 ----
  describe('a targeted country is an intent to work there', () => {
    it('surfaces an on-site job in a targeted country instead of hard-excluding it', () => {
      const d = service.evaluate(onsiteIn('CA'), candidate({ targetCountries: ['CA'] }));

      expect(d.status).not.toBe(EligibilityStatus.INELIGIBLE);
      expect(d.reasons.some((r) => r.code === ReasonCode.COUNTRY_NOT_SUPPORTED)).toBe(false);
    });

    it('does NOT require willingToRelocate + internationalRelocation to see it', () => {
      const cand = candidate({ targetCountries: ['CA'], willingToRelocate: false, internationalRelocation: false });

      expect(service.evaluate(onsiteIn('CA'), cand).status).not.toBe(EligibilityStatus.INELIGIBLE);
    });

    it('treats it as fully eligible when the candidate is also authorized there', () => {
      const d = service.evaluate(
        onsiteIn('CA'),
        candidate({ targetCountries: ['CA'], workAuthCountries: ['CA'] }),
      );

      expect(d.status).toBe(EligibilityStatus.ELIGIBLE);
      expect(d.autoApplySafe).toBe(true);
    });

    // AC1.5 — surfaced, but conditional, when they cannot yet work there.
    it('marks it conditional (soft) when the candidate is not authorized there', () => {
      const d = service.evaluate(onsiteIn('CA'), candidate({ targetCountries: ['CA'] }));

      expect(d.status).toBe(EligibilityStatus.CONDITIONALLY_ELIGIBLE);
      expect(d.reasons.some((r) => r.code === ReasonCode.RELOCATION_REQUIRED && r.severity === 'soft')).toBe(true);
    });

    it('applies the same rule to country-scoped remote roles', () => {
      const d = service.evaluate(remoteScopedTo(['CA']), candidate({ targetCountries: ['CA'] }));

      expect(d.status).not.toBe(EligibilityStatus.INELIGIBLE);
      expect(d.reasons.some((r) => r.code === ReasonCode.REMOTE_NOT_GLOBAL)).toBe(false);
    });
  });

  // ------------------------------------------------------------ AC1.2 ----
  describe('untargeted countries stay excluded', () => {
    it('hard-excludes an on-site job in a country the candidate does not target', () => {
      const d = service.evaluate(onsiteIn('DE'), candidate({ targetCountries: ['CA'] }));

      expect(d.status).toBe(EligibilityStatus.INELIGIBLE);
      expect(d.reasons.some((r) => r.code === ReasonCode.COUNTRY_NOT_SUPPORTED && r.severity === 'hard')).toBe(true);
    });

    it('hard-excludes a remote role scoped away from every target', () => {
      const d = service.evaluate(remoteScopedTo(['DE']), candidate({ targetCountries: ['CA'] }));

      expect(d.status).toBe(EligibilityStatus.INELIGIBLE);
    });
  });

  // ------------------------------------------------------------ AC1.6 ----
  describe('autoApplySafe', () => {
    it('is false for a conditionally-eligible job even at high confidence', () => {
      const d = service.evaluate(onsiteIn('CA'), candidate({ targetCountries: ['CA'] }));

      expect(d.autoApplySafe).toBe(false);
    });

    it('is false when the work country sits outside the targets', () => {
      // Eligible on its own terms (candidate is in and authorized for IN),
      // but the profile targets Canada — auto-apply must not fire.
      const d = service.evaluate(onsiteIn('IN'), candidate({ country: 'IN', targetCountries: ['CA'] }));

      expect(d.status).toBe(EligibilityStatus.ELIGIBLE);
      expect(d.autoApplySafe).toBe(false);
    });

    it('is true when eligible, confident, and inside the targets', () => {
      const d = service.evaluate(onsiteIn('IN'), candidate({ country: 'IN', targetCountries: ['IN'] }));

      expect(d.autoApplySafe).toBe(true);
    });

    it('stays true for genuinely global remote, which has no determinable work country', () => {
      const globalRemote = remoteScopedTo([], {
        country: null,
        remoteScope: RemoteScope.GLOBAL,
        eligibleCountries: [],
      });
      const d = service.evaluate(globalRemote, candidate({ targetCountries: ['CA'] }));

      expect(d.status).toBe(EligibilityStatus.ELIGIBLE);
      expect(d.autoApplySafe).toBe(true);
    });

    it('is false below the 0.7 confidence floor', () => {
      const d = service.evaluate(
        onsiteIn('IN', { locationConfidence: 0.65 }),
        candidate({ country: 'IN', targetCountries: ['IN'] }),
      );

      expect(d.autoApplySafe).toBe(false);
    });
  });

  // ------------------------------------------------------------ AC1.4 ----
  describe('backward compatibility (no targets set)', () => {
    it('keeps the old behaviour: own-country on-site is eligible', () => {
      const d = service.evaluate(onsiteIn('IN'), candidate({ targetCountries: [] }));

      expect(d.status).toBe(EligibilityStatus.ELIGIBLE);
      expect(d.autoApplySafe).toBe(true);
    });

    it('keeps the old behaviour: foreign on-site is hard-excluded without relocation', () => {
      const d = service.evaluate(onsiteIn('CA'), candidate({ targetCountries: [] }));

      expect(d.status).toBe(EligibilityStatus.INELIGIBLE);
    });

    it('keeps the old behaviour: relocation flags still soften a foreign role', () => {
      const d = service.evaluate(
        onsiteIn('CA'),
        candidate({ targetCountries: [], willingToRelocate: true, internationalRelocation: true }),
      );

      expect(d.status).toBe(EligibilityStatus.CONDITIONALLY_ELIGIBLE);
    });
  });

  describe('sponsorship still governs', () => {
    it('hard-excludes a targeted country when sponsorship is needed and refused', () => {
      const d = service.evaluate(
        remoteScopedTo(['CA'], { sponsorship: SponsorshipPolicy.NOT_AVAILABLE }),
        candidate({ targetCountries: ['CA'], needsSponsorship: true, workAuthCountries: [] }),
      );

      expect(d.status).toBe(EligibilityStatus.INELIGIBLE);
      expect(d.reasons.some((r) => r.code === ReasonCode.SPONSORSHIP_NOT_AVAILABLE)).toBe(true);
    });
  });
});
