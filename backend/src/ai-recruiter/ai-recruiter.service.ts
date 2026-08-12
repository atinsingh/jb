import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  RecruiterScreenResponseSchema,
  RecruiterSourcingResponseSchema,
  RecruiterCopilotResponseSchema,
  RecruiterScorecardResponseSchema,
} from '@jobocate/contracts';
import { LLMRoutingService, LLMFeature } from '../llm/llm-routing.service';
import { LLMQuotaService } from '../llm/llm-quota.service';
import {
  EmployerApplicant,
  EmployerApplicantDocument,
} from '../employer-pipeline/schemas/employer-applicant.schema';
import {
  EmployerAutopilotConfig,
  EmployerAutopilotConfigDocument,
} from './schemas/employer-autopilot-config.schema';
import {
  AiProposedAction,
  AiProposedActionDocument,
} from './schemas/ai-proposed-action.schema';
import {
  EmployerTalentCandidate,
  EmployerTalentCandidateDocument,
} from '../employer-talent/schemas/employer-talent-candidate.schema';

/**
 * AiRecruiterService
 *
 * Genuinely LLM-backed recruiting AI (Claude via the modern `llm/` stack) with
 * a guaranteed deterministic/heuristic fallback. Every LLM-augmented method
 * follows the canonical pipeline (enforceQuota → getProviderForFeature →
 * getFeatureConfig → provider.chat → JSON.parse → Zod.parse →
 * recordUsageAndIncrement) wrapped in a try/catch that returns the
 * deterministic result on any quota / API / parse / validation failure.
 *
 * The deterministic layer also serves as the *score prior*: model output is
 * blended and re-anchored onto it so results stay stable, and the final API
 * return shapes are byte-identical whether the LLM path or the fallback ran.
 *
 * Reuses the canonical EmployerApplicant model owned by the employer-pipeline
 * module (shared collection, `ownerId`-scoped) rather than redefining it.
 */
@Injectable()
export class AiRecruiterService {
  private readonly logger = new Logger(AiRecruiterService.name);

  constructor(
    @InjectModel(EmployerApplicant.name)
    private readonly applicantModel: Model<EmployerApplicantDocument>,
    private readonly routingService: LLMRoutingService,
    private readonly quotaService: LLMQuotaService,
    @InjectModel(EmployerAutopilotConfig.name)
    private readonly autopilotConfigModel: Model<EmployerAutopilotConfigDocument>,
    @InjectModel(AiProposedAction.name)
    private readonly proposedActionModel: Model<AiProposedActionDocument>,
    @InjectModel(EmployerTalentCandidate.name)
    private readonly talentModel: Model<EmployerTalentCandidateDocument>,
  ) {}

  // ---------------------------------------------------------------------------
  // Deterministic helpers
  // ---------------------------------------------------------------------------

  /** Stable, deterministic 32-bit hash for a string seed (FNV-1a style). */
  private stableHash(seed: string): number {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    // force unsigned
    return h >>> 0;
  }

  /** Deterministic pseudo-random in [0, 1) from a seed. */
  private seededUnit(seed: string): number {
    return (this.stableHash(seed) % 10000) / 10000;
  }

  private stageWeight(stage?: string): number {
    switch (stage) {
      case 'hired':
        return 100;
      case 'offer':
        return 90;
      case 'interview':
        return 75;
      case 'screening':
        return 55;
      case 'applied':
        return 40;
      case 'rejected':
        return 10;
      default:
        return 30;
    }
  }

  /**
   * Heuristic 0-100 score for an applicant. Combines stage weight, rating and a
   * stable seeded jitter so identical inputs always produce identical scores.
   */
  scoreApplicant(app: EmployerApplicantDocument): number {
    const id =
      (app._id ? app._id.toString() : '') +
      (app.candidateEmail || app.candidateName || '');
    const stageComponent = this.stageWeight(app.stage) * 0.5; // up to 50
    const ratingComponent = Math.min(5, app.rating || 0) * 6; // up to 30
    const baseMatch = Math.min(100, app.aiScore || 0) * 0.1; // up to 10
    const jitter = this.seededUnit(`score:${id}`) * 10; // up to 10
    return Math.round(stageComponent + ratingComponent + baseMatch + jitter);
  }

  rationaleFor(app: EmployerApplicantDocument, score: number): string {
    const bits: string[] = [];
    bits.push(`stage "${app.stage || 'applied'}"`);
    if (app.rating) bits.push(`recruiter rating ${app.rating}/5`);
    if (app.skills && app.skills.length) {
      bits.push(`${app.skills.length} relevant skills`);
    }
    if (app.yearsExperience) bits.push(`${app.yearsExperience}y experience`);
    const tier = score >= 75 ? 'Strong' : score >= 55 ? 'Promising' : 'Developing';
    return `${tier} fit (${score}/100) based on ${bits.join(', ')}.`;
  }

  private screenRecommendation(score: number): 'advance' | 'review' | 'hold' {
    return score >= 75 ? 'advance' : score >= 50 ? 'review' : 'hold';
  }

  /** Extract JSON from an LLM response, tolerating ```json code fences. */
  private parseLlmJson(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      const jsonMatch =
        content.match(/```json\n([\s\S]*?)\n```/) ||
        content.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error('Invalid JSON response from LLM');
    }
  }

  /** Clamp + round a 0-100 score. */
  private clampScore(n: number): number {
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  // ---------------------------------------------------------------------------
  // Autopilot
  // ---------------------------------------------------------------------------

  async getAutopilot(ownerId: string) {
    const applicants = await this.applicantModel
      .find({ ownerId })
      .sort({ createdAt: -1 })
      .exec();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const screenedToday = applicants.filter(
      (a) =>
        (a as any).updatedAt &&
        new Date((a as any).updatedAt) >= startOfDay &&
        a.stage !== 'applied',
    ).length;

    const queued = applicants.filter((a) => a.stage === 'applied').length;
    const reqsCovered = new Set(
      applicants.filter((a) => a.jobId).map((a) => a.jobId!.toString()),
    ).size;

    const actionsLimit = 200;
    const actionsUsed = Math.min(actionsLimit, screenedToday + queued);

    const queue = this.buildAutopilotQueueDeterministic(applicants);

    const config = await this.getOrCreateAutopilotConfig(ownerId);

    const decidedProposals = await this.proposedActionModel
      .find({ ownerId: new Types.ObjectId(ownerId), status: { $in: ['approved', 'rejected', 'failed'] } })
      .sort({ decidedAt: -1 })
      .limit(8)
      .lean();

    const activity = decidedProposals.map((p: any) => ({
      event: this.activityEventLabel(p),
      at: p.decidedAt,
    }));

    const rules = [
      {
        id: 'auto-screen',
        name: 'Auto-screen new applicants',
        description:
          'Screen incoming applicants and advance those scoring 60+ to screening.',
        enabled: true,
      },
      {
        id: 'auto-schedule',
        name: 'Auto-schedule strong candidates',
        description:
          'Propose interview slots for screening candidates scoring 70+.',
        enabled: true,
      },
      {
        id: 'reject-stale',
        name: 'Flag stale low-fit candidates',
        description: 'Flag low-scoring candidates that have stalled for review.',
        enabled: false,
      },
    ];

    return {
      enabled: config.enabled,
      status: config.enabled ? 'active' : 'idle',
      stats: {
        reqsCovered,
        screenedToday,
        queued,
        actionsUsed,
        actionsLimit,
      },
      rules,
      queue,
      activity,
    };
  }

  async getOrCreateAutopilotConfig(
    ownerId: string,
  ): Promise<EmployerAutopilotConfigDocument> {
    return this.autopilotConfigModel.findOneAndUpdate(
      { ownerId: new Types.ObjectId(ownerId) },
      { $setOnInsert: { enabled: false } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  private activityEventLabel(p: any): string {
    const verb =
      p.actionType === 'reject'
        ? 'Rejected'
        : p.actionType === 'advance_stage'
          ? 'Advanced'
          : p.actionType === 'schedule_interview'
            ? 'Interview scheduled for'
            : 'Message sent to';
    const outcome =
      p.status === 'failed'
        ? ' (failed — see reason)'
        : p.status === 'rejected'
          ? ' (dismissed)'
          : '';
    return `${verb} applicant${outcome}`;
  }

  /**
   * Deterministic proposed-action queue from applicants needing attention.
   * Shared score prior with `screen` (via scoreApplicant / rationaleFor).
   */
  private buildAutopilotQueueDeterministic(
    applicants: EmployerApplicantDocument[],
  ) {
    return applicants
      .filter((a) => a.stage === 'applied' || a.stage === 'screening')
      .slice(0, 10)
      .map((a) => {
        const score = this.scoreApplicant(a);
        const action =
          a.stage === 'applied'
            ? score >= 60
              ? 'advance_to_screening'
              : 'send_screening_questions'
            : score >= 70
              ? 'schedule_interview'
              : 'request_more_info';
        return {
          applicantId: a._id ? a._id.toString() : null,
          name: a.candidateName || 'Candidate',
          currentStage: a.stage || 'applied',
          proposedAction: action,
          score,
          rationale: this.rationaleFor(a, score),
        };
      })
      .sort((x, y) => y.score - x.score);
  }

  async toggleAutopilot(
    ownerId: string,
    enabled: boolean,
  ): Promise<{ enabled: boolean; status: string; message: string }> {
    await this.autopilotConfigModel.findOneAndUpdate(
      { ownerId: new Types.ObjectId(ownerId) },
      { $set: { enabled } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return {
      enabled,
      status: enabled ? 'active' : 'paused',
      message: enabled
        ? 'Autopilot enabled. Proposed actions will be generated for new applicants.'
        : 'Autopilot paused. No automated actions will be proposed.',
    };
  }

  // ---------------------------------------------------------------------------
  // Screen — LLM-ranked with deterministic anchor + fallback.
  // `ownerId` is the employer's user id (used for quota).
  // ---------------------------------------------------------------------------

  async screen(ownerId: string, jobId?: string) {
    const query: any = { ownerId };
    if (jobId) query.jobId = jobId;

    const applicants = await this.applicantModel.find(query).exec();
    const deterministic = this.screenDeterministic(applicants, jobId);

    try {
      await this.quotaService.enforceQuota(
        ownerId,
        LLMFeature.SCREEN_APPLICANTS,
      );
      const provider = this.routingService.getProviderForFeature(
        LLMFeature.SCREEN_APPLICANTS,
      );
      const config = this.routingService.getFeatureConfig(
        LLMFeature.SCREEN_APPLICANTS,
      );

      const applicantJson = applicants.map((a) => ({
        id: a._id ? a._id.toString() : '',
        name: a.candidateName || 'Candidate',
        headline: a.candidateHeadline || '',
        skills: Array.isArray(a.skills) ? a.skills : [],
        yearsExperience: Number(a.yearsExperience) || 0,
        stage: a.stage || 'applied',
        rating: a.rating || 0,
        priorScore: this.scoreApplicant(a),
      }));

      const response = await provider.chat({
        messages: [
          {
            role: 'system',
            content: `You are an expert technical recruiter screening applicants for a role. Rank each applicant by fit. Anchor your score near the provided "priorScore" (a deterministic baseline) and adjust only with clear justification. Return ONLY valid JSON matching this schema:
{
  "ranked": [
    { "id": "applicant id", "score": 0-100, "recommendation": "advance" | "review" | "hold", "rationale": "one sentence" }
  ]
}
Include every applicant exactly once, keyed by their "id".`,
          },
          {
            role: 'user',
            content: `Job requisition id: ${jobId || 'all open reqs'}\nApplicants:\n${JSON.stringify(applicantJson)}`,
          },
        ],
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      const parsed = this.parseLlmJson(response.content);
      const validated = RecruiterScreenResponseSchema.parse(parsed);

      const llmById = new Map(validated.ranked.map((r) => [r.id, r]));
      const ranked = deterministic.ranked
        .map((item) => {
          const llm =
            item.applicantId != null
              ? llmById.get(item.applicantId)
              : undefined;
          if (!llm) return item;
          const score = this.clampScore(0.5 * item.score + 0.5 * llm.score);
          return {
            applicantId: item.applicantId,
            name: item.name,
            title: item.title,
            stage: item.stage,
            score,
            recommendation: llm.recommendation,
            rationale: llm.rationale,
          };
        })
        .sort((x, y) => y.score - x.score);

      await this.quotaService.recordUsageAndIncrement(
        ownerId,
        LLMFeature.SCREEN_APPLICANTS,
        provider.getName(),
        config.model,
        response.usage,
        { jobId: jobId || null, applicantCount: applicants.length },
      );

      return { jobId: jobId || null, total: ranked.length, ranked };
    } catch (error: any) {
      this.logger.warn(
        `screen falling back to deterministic: ${error?.message || error}`,
      );
      return deterministic;
    }
  }

  private screenDeterministic(
    applicants: EmployerApplicantDocument[],
    jobId?: string,
  ) {
    const ranked = applicants
      .map((a) => {
        const score = this.scoreApplicant(a);
        return {
          applicantId: a._id ? a._id.toString() : null,
          name: a.candidateName || 'Candidate',
          title: a.candidateHeadline || '',
          stage: a.stage || 'applied',
          score,
          recommendation: this.screenRecommendation(score),
          rationale: this.rationaleFor(a, score),
        };
      })
      .sort((x, y) => y.score - x.score);

    return {
      jobId: jobId || null,
      total: ranked.length,
      ranked,
    };
  }

  // ---------------------------------------------------------------------------
  // Copilot — LLM reply, deterministic (machine-valid) actions + fallback.
  // `userId` is the employer's user id (used for quota).
  // ---------------------------------------------------------------------------

  async copilot(userId: string, message: string) {
    const deterministic = this.copilotDeterministic(message);

    try {
      await this.quotaService.enforceQuota(
        userId,
        LLMFeature.RECRUITER_COPILOT,
      );
      const provider = this.routingService.getProviderForFeature(
        LLMFeature.RECRUITER_COPILOT,
      );
      const config = this.routingService.getFeatureConfig(
        LLMFeature.RECRUITER_COPILOT,
      );

      const response = await provider.chat({
        messages: [
          {
            role: 'system',
            content: `You are a recruiting copilot inside a hiring platform. You can screen applicants, schedule interviews, source candidates, draft outreach and summarize interviews. Reply helpfully and concisely (2-3 sentences) to the recruiter. Return ONLY valid JSON: { "reply": "your reply text" }`,
          },
          { role: 'user', content: message || '' },
        ],
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      const parsed = this.parseLlmJson(response.content);
      const validated = RecruiterCopilotResponseSchema.parse(parsed);

      await this.quotaService.recordUsageAndIncrement(
        userId,
        LLMFeature.RECRUITER_COPILOT,
        provider.getName(),
        config.model,
        response.usage,
        { messageLength: (message || '').length },
      );

      // Keep the deterministic regex→actions so action `type`s stay valid.
      return { reply: validated.reply, actions: deterministic.actions };
    } catch (error: any) {
      this.logger.warn(
        `copilot falling back to deterministic: ${error?.message || error}`,
      );
      return deterministic;
    }
  }

  private copilotDeterministic(message: string) {
    const text = (message || '').toLowerCase();
    const actions: Array<{ type: string; label: string; params?: any }> = [];
    let reply: string;

    if (/(schedule|interview|book|calendar)/.test(text)) {
      reply =
        'I can schedule interviews for your top candidates. I will propose three time slots and send invites once you confirm.';
      actions.push({
        type: 'propose_interview_slots',
        label: 'Propose interview slots',
        params: { count: 3 },
      });
    } else if (/(reject|decline|pass|turn down)/.test(text)) {
      reply =
        'I can send a courteous rejection to the selected candidates and keep them in your talent pool for future roles.';
      actions.push({
        type: 'send_rejection',
        label: 'Send rejection email',
        params: { keepInPool: true },
      });
    } else if (/(screen|shortlist|rank|filter|score)/.test(text)) {
      reply =
        'I will screen and rank your current applicants by fit and surface the strongest matches for review.';
      actions.push({
        type: 'run_screening',
        label: 'Run screening on applicants',
      });
    } else if (/(source|find|search|candidate)/.test(text)) {
      reply =
        'I can source new candidates that match your brief and draft personalized outreach for each.';
      actions.push({
        type: 'open_sourcing',
        label: 'Source candidates',
      });
    } else if (/(offer|hire|extend)/.test(text)) {
      reply =
        'I can draft an offer for the selected candidate and route it for approval.';
      actions.push({
        type: 'draft_offer',
        label: 'Draft offer letter',
      });
    } else {
      reply =
        'I am your recruiting copilot. I can screen applicants, schedule interviews, source candidates, draft outreach, and summarize interviews. What would you like to do?';
      actions.push(
        { type: 'run_screening', label: 'Screen applicants' },
        { type: 'open_sourcing', label: 'Source candidates' },
      );
    }

    return { reply, actions };
  }

  // ---------------------------------------------------------------------------
  // Sourcing — LLM-ranked over the employer's REAL candidate pool + fallback.
  // No fabricated people: an empty pool yields an empty result.
  // `employerId` is the employer's user id (used for quota).
  // ---------------------------------------------------------------------------

  async sourcing(brief: string, employerId?: string) {
    const text = brief || '';
    const role = this.extractRole(text);

    // Pull this employer's real applicants (deduped by candidate) and talent
    // pool as the combined sourcing pool.
    const applicantPool = employerId
      ? await this.applicantModel
          .find({ ownerId: employerId })
          .sort({ appliedAt: -1 })
          .limit(200)
          .lean()
          .exec()
      : [];
    const talentPool = employerId
      ? await this.talentModel
          .find({ ownerId: new Types.ObjectId(employerId) })
          .limit(200)
          .lean()
      : [];

    const merged = this.mergeSourcingPools(applicantPool, talentPool);
    const built = this.buildSourcingCandidates(merged, text, role);
    const deterministic = {
      brief: text,
      role: role || null,
      total: built.length,
      candidates: built.map((b) => b.candidate),
    };

    if (!employerId || built.length === 0) {
      return deterministic;
    }

    try {
      await this.quotaService.enforceQuota(
        employerId,
        LLMFeature.SOURCE_CANDIDATES,
      );
      const provider = this.routingService.getProviderForFeature(
        LLMFeature.SOURCE_CANDIDATES,
      );
      const config = this.routingService.getFeatureConfig(
        LLMFeature.SOURCE_CANDIDATES,
      );

      const poolJson = built.map((b) => ({
        id: b.id,
        name: b.candidate.name,
        title: b.candidate.title,
        location: b.candidate.location,
        skills: b.candidate.skills,
        yearsExperience: b.candidate.yearsExperience,
        priorMatchScore: b.candidate.matchScore,
      }));

      const response = await provider.chat({
        messages: [
          {
            role: 'system',
            content: `You are a technical sourcer matching a company's existing candidate pool against a sourcing brief. Score each candidate's fit and draft a short, personalized outreach message (2-3 sentences). Anchor "matchScore" near the provided "priorMatchScore". Return ONLY valid JSON matching this schema:
{
  "candidates": [
    { "id": "candidate id", "matchScore": 0-100, "outreach": "personalized outreach message" }
  ]
}
Include every candidate exactly once, keyed by their "id".`,
          },
          {
            role: 'user',
            content: `Brief: ${text}\nDetected role: ${role || 'n/a'}\nCandidate pool:\n${JSON.stringify(poolJson)}`,
          },
        ],
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      const parsed = this.parseLlmJson(response.content);
      const validated = RecruiterSourcingResponseSchema.parse(parsed);

      const llmById = new Map(validated.candidates.map((c) => [c.id, c]));
      const candidates = built
        .map((b) => {
          const llm = llmById.get(b.id);
          if (!llm) return b.candidate;
          const matchScore = this.clampScore(
            0.5 * b.candidate.matchScore + 0.5 * llm.matchScore,
          );
          return {
            candidateId: b.candidate.candidateId,
            name: b.candidate.name,
            title: b.candidate.title,
            location: b.candidate.location,
            skills: b.candidate.skills,
            yearsExperience: b.candidate.yearsExperience,
            matchScore,
            outreach: llm.outreach,
            sourcePool: b.candidate.sourcePool,
          };
        })
        .sort((x, y) => y.matchScore - x.matchScore);

      await this.quotaService.recordUsageAndIncrement(
        employerId,
        LLMFeature.SOURCE_CANDIDATES,
        provider.getName(),
        config.model,
        response.usage,
        { role: role || null, poolSize: built.length },
      );

      return {
        brief: text,
        role: role || null,
        total: candidates.length,
        candidates,
      };
    } catch (error: any) {
      this.logger.warn(
        `sourcing falling back to deterministic: ${error?.message || error}`,
      );
      return deterministic;
    }
  }

  /**
   * Merges the applicant-history pool and talent pool into a single list,
   * deduping candidates present in both (keyed by candidateId, falling back
   * to email) and preferring the richer applicant-history record.
   */
  private mergeSourcingPools(
    applicants: any[],
    talent: any[],
  ): Array<{ record: any; sourcePool: 'talent_pool' | 'past_applicant' }> {
    const seen = new Set<string>(); // candidateId.toString() OR email, whichever is present
    const merged: Array<{ record: any; sourcePool: 'talent_pool' | 'past_applicant' }> = [];

    // Applicant history wins the dedup — it is the richer record.
    for (const app of applicants as any[]) {
      const key = app.candidateId ? String(app.candidateId) : (app.candidateEmail || '');
      if (key) seen.add(key);
      merged.push({ record: app, sourcePool: 'past_applicant' });
    }

    for (const cand of talent as any[]) {
      const key = cand.candidateId ? String(cand.candidateId) : (cand.email || '');
      if (key && seen.has(key)) continue; // already represented by a richer applicant record
      merged.push({ record: cand, sourcePool: 'talent_pool' });
    }

    return merged;
  }

  /**
   * Deterministic candidate scoring over the merged pool. Returns items
   * carrying the join `id` (record `_id`) alongside the exact-shape
   * candidate object, tagged with which pool it was sourced from.
   */
  private buildSourcingCandidates(
    pool: Array<{ record: any; sourcePool: 'talent_pool' | 'past_applicant' }>,
    text: string,
    role: string | null,
  ): Array<{ id: string; candidate: any }> {
    const tokens = text
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .filter((t) => t.length > 2);

    return pool
      .map(({ record, sourcePool }) => {
        const skills = Array.isArray(record.skills) ? record.skills : [];
        const overlap = skills.filter((s: string) =>
          tokens.some(
            (t) => s.toLowerCase().includes(t) || t.includes(s.toLowerCase()),
          ),
        ).length;
        const name = record.candidateName || record.name || 'Candidate';
        const headline = record.candidateHeadline || record.headline;
        const years = Number(record.yearsExperience) || 0;
        const jitter = this.seededUnit(`source:${String(record._id)}:${text}`) * 10;
        const score = Math.round(
          Math.min(100, 35 + overlap * 14 + Math.min(20, years) + jitter),
        );
        return {
          id: String(record._id),
          candidate: {
            candidateId: record.candidateId ? String(record.candidateId) : null,
            name,
            title: headline || role || 'Candidate',
            location: record.candidateLocation || '',
            skills,
            yearsExperience: years,
            matchScore: score,
            outreach: this.draftOutreach(
              name,
              role || headline || 'role',
              skills,
            ),
            sourcePool,
          },
        };
      })
      .sort((x, y) => y.candidate.matchScore - x.candidate.matchScore);
  }

  private extractRole(brief: string): string | null {
    const m = brief.match(
      /\b(engineer|designer|manager|scientist|recruiter|developer|analyst|architect|lead)\b/i,
    );
    return m ? m[0].toLowerCase() : null;
  }

  private draftOutreach(name: string, role: string, skills: string[]): string {
    const first = name.split(' ')[0];
    const topSkills = skills.slice(0, 2).join(' and ');
    return (
      `Hi ${first}, I came across your background and was impressed by your ` +
      `experience with ${topSkills}. We are hiring for a ${role} role and ` +
      `your profile looks like a strong match. Would you be open to a quick ` +
      `15-minute chat this week?`
    );
  }

  // ---------------------------------------------------------------------------
  // Interview scorecard — LLM structured output + deterministic fallback.
  // `userId` is the employer's user id (used for quota).
  // ---------------------------------------------------------------------------

  async scorecard(userId: string, transcript?: string, notes?: string) {
    const deterministic = this.scorecardDeterministic(transcript, notes);
    const source = `${transcript || ''}\n${notes || ''}`.trim();

    // Nothing to analyze — return the baseline template without spending quota.
    if (source.length === 0) {
      return deterministic;
    }

    try {
      await this.quotaService.enforceQuota(
        userId,
        LLMFeature.INTERVIEW_SCORECARD,
      );
      const provider = this.routingService.getProviderForFeature(
        LLMFeature.INTERVIEW_SCORECARD,
      );
      const config = this.routingService.getFeatureConfig(
        LLMFeature.INTERVIEW_SCORECARD,
      );

      const response = await provider.chat({
        messages: [
          {
            role: 'system',
            content: `You are an interview panelist producing a structured scorecard from an interview transcript and/or notes. Rate each competency 1-5 with brief evidence, give an overall score (1-5, one decimal) and a hire recommendation. Return ONLY valid JSON matching this schema:
{
  "overall": 1-5,
  "recommendation": "hire" | "lean_hire" | "lean_no_hire" | "no_hire",
  "competencies": [ { "competency": "name", "rating": 1-5, "evidence": "brief evidence" } ],
  "summary": "one paragraph",
  "nextSteps": ["step", "..."]
}`,
          },
          {
            role: 'user',
            content: `Transcript:\n${transcript || '(none)'}\n\nNotes:\n${notes || '(none)'}`,
          },
        ],
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      const parsed = this.parseLlmJson(response.content);
      const validated = RecruiterScorecardResponseSchema.parse(parsed);

      await this.quotaService.recordUsageAndIncrement(
        userId,
        LLMFeature.INTERVIEW_SCORECARD,
        provider.getName(),
        config.model,
        response.usage,
        { sourceLength: source.length },
      );

      // `hasContent` is a computed field, never from the model.
      return { hasContent: deterministic.hasContent, ...validated };
    } catch (error: any) {
      this.logger.warn(
        `scorecard falling back to deterministic: ${error?.message || error}`,
      );
      return deterministic;
    }
  }

  private scorecardDeterministic(transcript?: string, notes?: string) {
    const source = `${transcript || ''}\n${notes || ''}`.trim();
    const text = source.toLowerCase();
    const length = source.length;

    const competencies = [
      { key: 'technical', label: 'Technical Skills', keywords: ['code', 'algorithm', 'design', 'system', 'debug', 'architecture'] },
      { key: 'communication', label: 'Communication', keywords: ['explain', 'clear', 'articulate', 'collaborate', 'team'] },
      { key: 'problemSolving', label: 'Problem Solving', keywords: ['solve', 'approach', 'tradeoff', 'analyze', 'reason'] },
      { key: 'culture', label: 'Culture / Values', keywords: ['ownership', 'mentor', 'feedback', 'curious', 'driven'] },
    ];

    const scored = competencies.map((c) => {
      const hits = c.keywords.filter((k) => text.includes(k)).length;
      const jitter = this.seededUnit(`scorecard:${c.key}:${source}`);
      // 1-5 scale, deterministic
      const raw = 2.5 + hits * 0.6 + jitter;
      const rating = Math.max(1, Math.min(5, Math.round(raw)));
      return {
        competency: c.label,
        rating,
        evidence:
          hits > 0
            ? `${hits} signal(s) referencing ${c.label.toLowerCase()} in the notes.`
            : `Limited explicit signal on ${c.label.toLowerCase()}; rated from baseline.`,
      };
    });

    const overall =
      Math.round(
        (scored.reduce((s, c) => s + c.rating, 0) / scored.length) * 10,
      ) / 10;

    const recommendation =
      overall >= 4 ? 'hire' : overall >= 3 ? 'lean_hire' : overall >= 2 ? 'lean_no_hire' : 'no_hire';

    return {
      hasContent: length > 0,
      overall,
      recommendation,
      competencies: scored,
      summary:
        length > 0
          ? `Overall ${overall}/5 (${recommendation.replace('_', ' ')}). Scorecard derived heuristically from the provided ${transcript ? 'transcript' : 'notes'}.`
          : 'No transcript or notes provided; returning a baseline scorecard template.',
      nextSteps:
        overall >= 3
          ? ['Schedule next round', 'Share scorecard with hiring panel']
          : ['Hold for debrief', 'Gather additional signal'],
    };
  }
}
