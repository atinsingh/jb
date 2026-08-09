import { Injectable } from '@nestjs/common';
import {
  EligibilityStatus,
  ReasonCode,
  RemoteScope,
  Severity,
  SponsorshipPolicy,
  WorkplaceType,
  countryName,
} from './geo.constants';

export interface CandidateEligibilityProfile {
  country?: string | null; // ISO2 — where the candidate CURRENTLY is
  region?: string | null;
  willingToRelocate?: boolean;
  internationalRelocation?: boolean;
  needsSponsorship?: boolean;
  workAuthCountries?: string[]; // ISO2 where candidate MAY legally work
  remoteOnly?: boolean;
  /**
   * ISO2 countries the candidate WANTS to work in, resolved from the driving
   * `JobProfile` (see `resolveTargetCountries`). Empty means "unfiltered".
   *
   * Targeting a country is a statement of intent: a job there is downgraded
   * from a hard exclusion to a soft, surfaced-but-conditional result, and it is
   * treated as fully eligible when the candidate is also authorized there.
   */
  targetCountries?: string[];
}

export interface JobEligibilityInput {
  isActive?: boolean;
  country?: string | null;
  region?: string | null;
  workplaceType?: string;
  remoteScope?: string;
  eligibleCountries?: string[];
  excludedCountries?: string[];
  sponsorship?: string;
  locationConfidence?: number;
  needsGeoReview?: boolean;
}

export interface EligibilityReason {
  code: ReasonCode;
  severity: Severity;
  message: string;
}

export interface EligibilityDecision {
  status: EligibilityStatus;
  reasons: EligibilityReason[];
  geographyExplanation: string;
  confidence: number;
  autoApplySafe: boolean;
}

@Injectable()
export class EligibilityService {
  /**
   * Stage 1 — deterministic eligibility. Geography / legal rules here are HARD
   * and can never be overridden by a downstream skill-match score.
   */
  evaluate(job: JobEligibilityInput, cand: CandidateEligibilityProfile): EligibilityDecision {
    const reasons: EligibilityReason[] = [];
    const add = (code: ReasonCode, severity: Severity, message: string) => reasons.push({ code, severity, message });

    const wp = (job.workplaceType as WorkplaceType) || WorkplaceType.UNSPECIFIED;
    const scope = (job.remoteScope as RemoteScope) || RemoteScope.UNSPECIFIED;
    const eligible = (job.eligibleCountries || []).map((c) => c.toUpperCase());
    const conf = typeof job.locationConfidence === 'number' ? job.locationConfidence : 0.5;
    const candCountry = (cand.country || '').toUpperCase() || null;
    const authIn = (cand.workAuthCountries || []).map((c) => c.toUpperCase());
    // Where the candidate WANTS to work. Falls back to their current country so
    // profiles with no stated target behave exactly as they did before.
    const targets = (cand.targetCountries || []).map((c) => c.toUpperCase());
    const effectiveTargets = targets.length ? targets : candCountry ? [candCountry] : [];
    /** Authorized to work there outright (own country counts). */
    const authorizedIn = (c: string) => authIn.includes(c) || c === candCountry;

    // 0) Freshness
    if (job.isActive === false) {
      add(ReasonCode.JOB_EXPIRED, 'hard', 'This job is no longer active.');
      return this.decide(reasons, this.geoText(job), conf);
    }

    // 1) Excluded countries (hard)
    if (candCountry && (job.excludedCountries || []).map((c) => c.toUpperCase()).includes(candCountry)) {
      add(ReasonCode.COUNTRY_NOT_SUPPORTED, 'hard', `Applications from ${countryName(candCountry)} are excluded.`);
    }

    // 2) Low-confidence geography
    if (job.needsGeoReview || conf < 0.4) {
      add(ReasonCode.JOB_LOW_CONFIDENCE, 'soft', 'Location details are unclear — confirm you can work from your country.');
    }

    // 3) Core geography
    if (!candCountry) {
      add(ReasonCode.INSUFFICIENT_JOB_INFORMATION, 'soft', 'Set your country in preferences to filter by eligibility.');
    } else if (wp === WorkplaceType.REMOTE) {
      if (scope === RemoteScope.GLOBAL) {
        add(ReasonCode.REMOTE_GLOBAL, 'info', 'Open to remote workers worldwide.');
      } else if (eligible.length) {
        // A country the candidate targets counts as somewhere they intend to
        // work, so the job is surfaced instead of hard-excluded.
        const targetedMatch = eligible.find((c) => effectiveTargets.includes(c));
        if (eligible.includes(candCountry)) {
          add(ReasonCode.COUNTRY_ELIGIBLE, 'info', `Remote — open to candidates in ${countryName(candCountry)}.`);
        } else if (targetedMatch && authorizedIn(targetedMatch)) {
          add(
            ReasonCode.COUNTRY_ELIGIBLE,
            'info',
            `Remote — open to candidates in ${countryName(targetedMatch)}, where you're authorized to work.`,
          );
        } else if (targetedMatch) {
          add(
            ReasonCode.RELOCATION_REQUIRED,
            'soft',
            `Remote is limited to ${countryName(targetedMatch)} — a country you're targeting, but you'd need work authorization there.`,
          );
        } else if (this.canRelocateInternationally(cand)) {
          add(ReasonCode.RELOCATION_REQUIRED, 'soft', `Remote is limited to ${eligible.map(countryName).join(', ')}; would require relocation.`);
        } else {
          add(ReasonCode.REMOTE_NOT_GLOBAL, 'hard', `Remote is limited to ${eligible.map(countryName).join(', ')}, not ${countryName(candCountry)}.`);
        }
      } else {
        // Unknown scope — conservative: surface but flag, never auto-apply.
        add(ReasonCode.INSUFFICIENT_JOB_INFORMATION, 'soft', 'Remote scope isn’t stated — confirm your country is accepted before applying.');
      }
    } else {
      // ONSITE / HYBRID / FIELD_BASED / UNSPECIFIED-with-place
      const jobCountry = (job.country || '').toUpperCase() || null;
      if (!jobCountry) {
        add(ReasonCode.INSUFFICIENT_JOB_INFORMATION, 'soft', 'Work country isn’t clear for this on-site role.');
      } else if (jobCountry === candCountry) {
        add(ReasonCode.COUNTRY_ELIGIBLE, 'info', `${this.wpLabel(wp)} in ${countryName(jobCountry)}.`);
        // Commute / region check for on-site & hybrid
        if ((wp === WorkplaceType.ONSITE || wp === WorkplaceType.HYBRID) && this.regionsDiffer(job.region, cand.region)) {
          if (cand.willingToRelocate) add(ReasonCode.RELOCATION_REQUIRED, 'soft', `Based in ${job.region}; would require relocating within ${countryName(jobCountry)}.`);
          else add(ReasonCode.OUTSIDE_COMMUTING_RANGE, 'hard', `On-site in ${job.region}, outside your area (${cand.region}).`);
        }
      } else {
        // Different country from where the candidate currently is. Targeting it
        // is an explicit statement of intent, so it is never a hard exclusion.
        const targeted = effectiveTargets.includes(jobCountry);
        if (targeted && authorizedIn(jobCountry)) {
          add(
            ReasonCode.COUNTRY_ELIGIBLE,
            'info',
            `${this.wpLabel(wp)} in ${countryName(jobCountry)}, where you're authorized to work.`,
          );
        } else if (targeted) {
          add(
            ReasonCode.RELOCATION_REQUIRED,
            'soft',
            `${this.wpLabel(wp)} in ${countryName(jobCountry)} — a country you're targeting, but you'd need to relocate or gain work authorization.`,
          );
        } else if (this.canRelocateInternationally(cand)) {
          add(ReasonCode.RELOCATION_REQUIRED, 'soft', `Located in ${countryName(jobCountry)}; would require international relocation.`);
        } else {
          add(ReasonCode.COUNTRY_NOT_SUPPORTED, 'hard', `On-site in ${countryName(jobCountry)}, not ${countryName(candCountry)}.`);
        }
      }
    }

    // 4) Sponsorship — only relevant if a work country applies and candidate needs it there.
    const workCountry = eligible[0] || (job.country ? job.country.toUpperCase() : null);
    // Auto-apply must never fire outside the countries this profile targets.
    // An undeterminable work country (e.g. genuinely global remote) is not a
    // reason to block — only a determinable, non-targeted one is.
    const geoTargeted =
      !workCountry || !effectiveTargets.length || effectiveTargets.includes(workCountry);
    if (
      cand.needsSponsorship &&
      workCountry &&
      !authIn.includes(workCountry) &&
      workCountry !== candCountry && // in your own country you don't need sponsorship
      job.sponsorship === SponsorshipPolicy.NOT_AVAILABLE
    ) {
      add(ReasonCode.SPONSORSHIP_NOT_AVAILABLE, 'hard', `You’d need sponsorship for ${countryName(workCountry)}, which this employer doesn’t offer.`);
    }

    return this.decide(reasons, this.geoText(job), conf, geoTargeted);
  }

  /* --------------------------------------------------------------- utils */
  private decide(
    reasons: EligibilityReason[],
    geographyExplanation: string,
    confidence: number,
    /** False when the job's work country sits outside the profile's targets. */
    geoTargeted = true,
  ): EligibilityDecision {
    const hasHard = reasons.some((r) => r.severity === 'hard');
    const hasSoft = reasons.some((r) => r.severity === 'soft');
    let status: EligibilityStatus;
    if (hasHard) status = EligibilityStatus.INELIGIBLE;
    else if (hasSoft) status = EligibilityStatus.CONDITIONALLY_ELIGIBLE;
    else status = EligibilityStatus.ELIGIBLE;

    // Auto-apply is far stricter than a recommendation: fully eligible, high
    // geographic confidence, AND inside the countries the profile targets.
    const autoApplySafe =
      status === EligibilityStatus.ELIGIBLE && confidence >= 0.7 && geoTargeted;

    return { status, reasons, geographyExplanation, confidence, autoApplySafe };
  }

  private canRelocateInternationally(c: CandidateEligibilityProfile) {
    return !!(c.willingToRelocate && c.internationalRelocation);
  }

  private regionsDiffer(a?: string | null, b?: string | null) {
    if (!a || !b) return false;
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
    const na = norm(a);
    const nb = norm(b);
    if (!na || !nb) return false;
    return !na.includes(nb) && !nb.includes(na);
  }

  private wpLabel(wp: WorkplaceType) {
    return { ONSITE: 'On-site', HYBRID: 'Hybrid', REMOTE: 'Remote', FIELD_BASED: 'Field-based', UNSPECIFIED: 'On-site' }[wp];
  }

  private geoText(job: JobEligibilityInput): string {
    const wp = (job.workplaceType as WorkplaceType) || WorkplaceType.UNSPECIFIED;
    if (wp === WorkplaceType.REMOTE) {
      const scope = (job.remoteScope as RemoteScope) || RemoteScope.UNSPECIFIED;
      if (scope === RemoteScope.GLOBAL) return 'Remote · worldwide';
      if ((job.eligibleCountries || []).length) return `Remote · ${(job.eligibleCountries || []).map(countryName).join(', ')} only`;
      return 'Remote · scope not stated';
    }
    const place = [job.region, job.country ? countryName(job.country) : null].filter(Boolean).join(', ');
    return `${this.wpLabel(wp)}${place ? ' · ' + place : ''}`;
  }
}
