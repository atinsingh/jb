import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Job, JobDocument } from '../schemas/job.schema';
import { UserPreferences, UserPreferencesDocument } from '../schemas/user-preferences.schema';
import { Resume, ResumeDocument } from '../schemas/resume.schema';
import { JobProfile, JobProfileDocument } from '../schemas/job-profile.schema';
import { EligibilityService, CandidateEligibilityProfile } from '../geography/eligibility.service';
import { resolveTargetCountries } from '../geography/target-countries.util';
import { JobGeoService } from '../geography/job-geo.service';
import { EligibilityStatus } from '../geography/geo.constants';
import { MatchScorerService, ScoreCandidate } from './match-scorer.service';
import { normalizeSkills } from './skill-taxonomy';

const MATCH_LABELS: Record<string, string> = {
  ELIGIBLE: 'Eligible',
  CONDITIONALLY_ELIGIBLE: 'Eligible with conditions',
  NEEDS_REVIEW: 'Needs review',
  UNKNOWN: 'Unknown',
  INELIGIBLE: 'Not eligible',
};

@Injectable()
export class EligibleJobsService {
  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(UserPreferences.name) private prefsModel: Model<UserPreferencesDocument>,
    @InjectModel(Resume.name) private resumeModel: Model<ResumeDocument>,
    @InjectModel(JobProfile.name) private profileModel: Model<JobProfileDocument>,
    private eligibility: EligibilityService,
    private geo: JobGeoService,
    private scorer: MatchScorerService,
  ) {}

  /** Aggregate the candidate's skills + title from their résumés AND the active
   *  job profile for Stage-2 scoring. */
  private async scoreProfile(userId: string, prefs: any, profile?: any): Promise<ScoreCandidate> {
    const resumes: any[] = await this.resumeModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ isPrimary: -1, updatedAt: -1 })
      .limit(5)
      .lean();
    const skillSet = new Set<string>();
    let title = '';
    for (const r of resumes) {
      (r.skills || []).forEach((s: string) => skillSet.add(s));
      if (!title) title = r.headline || (r.experience && r.experience[0] && r.experience[0].title) || '';
    }

    // The JobProfile is where the candidate states, explicitly and per-search,
    // what they want to be matched on. Ignoring its skills/role meant a profile
    // could look fully configured while contributing nothing but its target
    // countries: a résumé with no parsed skills produced a zero-skill candidate,
    // every job scored near the floor, and the whole pool fell below the
    // recommendation threshold — an empty screen that blamed the job market.
    (profile?.skills || []).forEach((s: string) => { if (s) skillSet.add(s); });
    if (!title) title = profile?.role || '';

    (prefs.titles || []).forEach((t: string) => { if (!title) title = t; });
    return {
      skills: normalizeSkills([...skillSet]),
      title,
      seniority: title,
      remoteOnly: !!prefs.remoteOnly,
    };
  }

  private eligProfile(p: any, targetCountries: string[] = []): CandidateEligibilityProfile {
    return {
      country: (p.country || '').toUpperCase() || null,
      region: p.region || null,
      willingToRelocate: !!p.willingToRelocate,
      internationalRelocation: !!p.internationalRelocation,
      needsSponsorship: !!p.visaSponsorshipNeeded,
      workAuthCountries: p.workAuthCountries || [],
      remoteOnly: !!p.remoteOnly,
      targetCountries,
    };
  }

  /**
   * Resolve which countries this search is FOR.
   *
   * Uses the named `JobProfile` when given, otherwise the candidate's active
   * profile. A candidate with no profile at all falls back to their current
   * country, so matching keeps working before any profile is created.
   */
  /**
   * The JobProfile that scopes this search: an explicitly requested one, else
   * the active one. Resolved ONCE per search and threaded through targeting,
   * scoring and thresholds — previously each of those looked it up (or failed
   * to) independently, which is how a profile could supply target countries
   * while its skills, role and match threshold were silently ignored.
   */
  private async resolveProfile(userId: string, profileId?: string): Promise<any | null> {
    const query: any = { userId: new Types.ObjectId(userId) };
    if (profileId && Types.ObjectId.isValid(profileId)) query._id = new Types.ObjectId(profileId);
    else query.active = true;

    return this.profileModel.findOne(query).sort({ updatedAt: -1 }).lean();
  }

  /**
   * Stage 1 pipeline: indexed geo pre-filter → deterministic eligibility →
   * eligible results with structured explanations. Never runs job×candidate
   * across the whole DB; the pre-filter bounds the pool first.
   */
  async getEligibleJobs(
    userId: string,
    opts: { keywords?: string; limit?: number; includeConditional?: boolean; profileId?: string } = {},
  ) {
    const prefs: any = (await this.prefsModel.findOne({ userId: new Types.ObjectId(userId) }).lean()) || {};
    const profile = await this.resolveProfile(userId, opts.profileId);
    const targets = resolveTargetCountries(profile, prefs);
    const cand = this.eligProfile(prefs, targets);
    const scoreCand = await this.scoreProfile(userId, prefs, profile);
    const pref = this.buildPrefFilter(prefs, profile);
    const limit = Math.min(opts.limit || 40, 100);

    // ---- Stage 1a: fast indexed pre-filter to bound the candidate pool ----
    const query: any = { isActive: { $ne: false } };
    if (opts.keywords) {
      const rx = new RegExp(opts.keywords.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$and = [{ $or: [{ title: rx }, { companyName: rx }] }];
    }
    if (targets.length) {
      // Keep only jobs plausibly available in a country this profile TARGETS.
      // Previously this keyed off the candidate's CURRENT country, so someone in
      // India targeting Canada could never see Canadian roles.
      const geoOr: any[] = [
        { remoteScope: 'GLOBAL' },
        { eligibleCountries: { $in: targets } },
        { country: { $in: targets } },
        { country: { $in: [null, ''] }, workplaceType: { $in: [null, 'UNSPECIFIED'] } }, // legacy/un-normalized
      ];

      // `remoteScope` on preferences finally means something: when the candidate
      // restricts remote work to specific countries, stop letting remote jobs of
      // unknown scope through the pre-filter.
      const prefScope = String(prefs.remoteScope || '').toLowerCase();
      const strictRemote = prefScope === 'selected_countries' || prefScope === 'current_country';
      if (!strictRemote) {
        geoOr.push({ workplaceType: 'REMOTE', remoteScope: { $in: [null, 'UNSPECIFIED'] } });
      }

      if (cand.willingToRelocate && cand.internationalRelocation) {
        geoOr.push({ workplaceType: { $in: ['ONSITE', 'HYBRID'] } }); // relocation opens on-site anywhere
      }
      query.$and = [...(query.$and || []), { $or: geoOr }];
    }

    // Fetch a bounded pool (freshest first), then apply deterministic rules.
    // Scan a generous pool so restrictive preferences (e.g. remote-only + high
    // min-match) still surface matches that sit deeper than the freshest page.
    const pool = await this.jobModel
      .find(query)
      .sort({ scrapedAt: -1, createdAt: -1 })
      .limit(Math.max(limit * 8, 400))
      .lean();

    // ---- Stage 1b: deterministic eligibility with reasons ----
    const results: any[] = [];
    for (const job of pool as any[]) {
      // Backfill geo on the fly for legacy rows that were scraped pre-engine.
      let j = job;
      if (!job.workplaceType) {
        const g = this.geo.normalize({ location: job.location, description: job.description, title: job.title });
        j = { ...job, ...g };
      }
      const decision = this.eligibility.evaluate(
        {
          isActive: j.isActive,
          country: j.country,
          region: j.region,
          workplaceType: j.workplaceType,
          remoteScope: j.remoteScope,
          eligibleCountries: j.eligibleCountries,
          excludedCountries: j.excludedCountries,
          sponsorship: j.sponsorship,
          locationConfidence: j.locationConfidence,
          needsGeoReview: j.needsGeoReview,
        },
        cand,
      );

      if (decision.status === EligibilityStatus.INELIGIBLE) continue;

      // ---- Preference filters (recommendation controls + exclusions) ----
      // Exclusions override match score; workplace/employment are hard prefs.
      if (this.prefExcludes(pref, j)) continue;

      // ---- Stage 2: weighted, explainable fit score (only for eligible jobs) ----
      const m = this.scorer.score(scoreCand, {
        title: j.title,
        description: j.description,
        skills: j.skills,
        workplaceType: j.workplaceType,
        scrapedAt: j.scrapedAt,
        source: j.source,
      });

      // Recommendation floor — hide roles below the candidate's minimum match.
      if (m.score < pref.minMatch) continue;

      results.push({
        id: j._id,
        title: j.title,
        companyName: j.companyName,
        companyLogo: j.companyLogo || this.geo.deriveLogo(j.companyName, j.externalUrl),
        location: j.location,
        workplaceType: j.workplaceType,
        remoteScope: j.remoteScope,
        source: j.source,
        externalUrl: j.externalUrl,
        scrapedAt: j.scrapedAt,
        skills: (j.skills && j.skills.length ? j.skills : m.matchedSkills.concat(m.missingSkills)).slice(0, 8),
        matchScore: m.score,
        matchLabel: m.label,
        matchExplanation: m.explanation,
        matchedSkills: m.matchedSkills,
        missingSkills: m.missingSkills,
        matchFactors: m.factors,
        eligibility: {
          status: decision.status,
          label: MATCH_LABELS[decision.status] || decision.status,
          geographyExplanation: decision.geographyExplanation,
          reasons: decision.reasons,
          autoApplySafe: decision.autoApplySafe,
          confidence: decision.confidence,
        },
      });
    }

    // Eligible first, then conditional; within each, highest fit score first.
    const rank = (s: string) => (s === EligibilityStatus.ELIGIBLE ? 0 : 1);
    results.sort((a, b) => rank(a.eligibility.status) - rank(b.eligibility.status) || b.matchScore - a.matchScore);
    const top = results.slice(0, limit);

    return {
      jobs: top,
      total: top.length,
      candidateCountry: cand.country,
      hasCandidateLocation: !!cand.country,
      candidateSkillCount: scoreCand.skills.length,
      // Which countries this search was FOR — the empty state needs these to
      // explain itself ("0 jobs in Canada") instead of showing a bare shrug.
      targetCountries: targets,
      hasTargetCountries: targets.length > 0,
    };
  }

  /* ----------------------------------------- preference filters + preview */
  private buildPrefFilter(prefs: any, profile?: any) {
    const EMP_MAP: Record<string, string> = {
      full_time: 'full-time', part_time: 'part-time', contract: 'contract',
      contract_to_hire: 'contract', temporary: 'temporary', internship: 'internship', freelance: 'contract',
    };
    return {
      // A profile-scoped search obeys that profile's own threshold; the global
      // preference is the fallback. Previously the profile's minMatchScore was
      // stored, shown in the UI, and never consulted.
      minMatch:
        (typeof profile?.minMatchScore === 'number' ? profile.minMatchScore : undefined) ??
        prefs.minMatchScore ??
        0,
      workplaces: (prefs.workplaceTypes || []).map((w: string) => w.toUpperCase()),
      employments: new Set((prefs.employmentTypes || []).map((e: string) => EMP_MAP[e]).filter(Boolean)),
      exclCompanies: new Set((prefs.companyBlocklist || []).map((s: string) => s.toLowerCase().trim())),
      exclTitles: [...(prefs.excludedTitles || []), ...(prefs.excludedKeywords || [])]
        .map((s: string) => s.toLowerCase().trim())
        .filter(Boolean),
    };
  }

  private prefExcludes(pref: any, j: any): boolean {
    if (pref.exclCompanies.has((j.companyName || '').toLowerCase())) return true;
    const title = (j.title || '').toLowerCase();
    if (pref.exclTitles.some((t: string) => title.includes(t))) return true;
    if (pref.workplaces.length && j.workplaceType && j.workplaceType !== 'UNSPECIFIED' && !pref.workplaces.includes(j.workplaceType)) return true;
    const KNOWN = ['full-time', 'part-time', 'contract', 'temporary', 'internship'];
    const jt = (j.jobType || '').toLowerCase();
    if ((pref.employments as Set<string>).size && KNOWN.includes(jt) && !pref.employments.has(jt)) return true;
    return false;
  }

  /** Real counts for the preferences "Preview matching impact" panel. */
  async previewImpact(userId: string, profileId?: string) {
    const prefs: any = (await this.prefsModel.findOne({ userId: new Types.ObjectId(userId) }).lean()) || {};
    const profile = await this.resolveProfile(userId, profileId);
    const targets = resolveTargetCountries(profile, prefs);
    const cand = this.eligProfile(prefs, targets);
    const scoreCand = await this.scoreProfile(userId, prefs, profile);
    const pref = this.buildPrefFilter(prefs, profile);
    const pool = await this.jobModel.find({ isActive: { $ne: false } }).sort({ scrapedAt: -1 }).limit(1500).lean();

    let eligible = 0, excludedByGeography = 0, excludedByPreference = 0, belowMinMatch = 0, recommended = 0, autoApplyEligible = 0;
    for (const job of pool as any[]) {
      let j = job;
      if (!job.workplaceType) j = { ...job, ...this.geo.normalize({ location: job.location, description: job.description, title: job.title }) };
      const d = this.eligibility.evaluate(
        { isActive: j.isActive, country: j.country, region: j.region, workplaceType: j.workplaceType, remoteScope: j.remoteScope, eligibleCountries: j.eligibleCountries, excludedCountries: j.excludedCountries, sponsorship: j.sponsorship, locationConfidence: j.locationConfidence, needsGeoReview: j.needsGeoReview },
        cand,
      );
      if (d.status === EligibilityStatus.INELIGIBLE) {
        if (d.reasons.some((rr: any) => ['COUNTRY_NOT_SUPPORTED', 'REMOTE_NOT_GLOBAL', 'REGION_NOT_SUPPORTED', 'OUTSIDE_COMMUTING_RANGE'].includes(rr.code))) excludedByGeography++;
        continue;
      }
      eligible++;
      if (this.prefExcludes(pref, j)) { excludedByPreference++; continue; }
      const m = this.scorer.score(scoreCand, { title: j.title, description: j.description, skills: j.skills, workplaceType: j.workplaceType, scrapedAt: j.scrapedAt, source: j.source });
      if (m.score < pref.minMatch) { belowMinMatch++; continue; }
      recommended++;
      if (d.autoApplySafe && m.score >= (prefs.autoApplyMinScore ?? 85)) autoApplyEligible++;
    }
    return {
      poolSize: pool.length,
      eligible,
      excludedByGeography,
      excludedByPreference,
      belowMinMatch,
      recommended,
      autoApplyEligible,
      hasCountry: !!cand.country,
      targetCountries: targets,
      hasTargetCountries: targets.length > 0,
    };
  }
}
