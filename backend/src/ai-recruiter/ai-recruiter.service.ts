import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  EmployerApplicant,
  EmployerApplicantDocument,
} from '../employer-pipeline/schemas/employer-applicant.schema';

/**
 * AiRecruiterService
 *
 * Fully self-contained, deterministic/heuristic recruiting AI. No external LLM
 * calls are made anywhere, so endpoints never fail due to a third-party
 * dependency. All scoring is derived from applicant stage/rating plus a stable
 * seeded hash so results are reproducible for a given input.
 *
 * Reuses the canonical EmployerApplicant model owned by the employer-pipeline
 * module (shared collection, `ownerId`-scoped) rather than redefining it.
 */
@Injectable()
export class AiRecruiterService {
  constructor(
    @InjectModel(EmployerApplicant.name)
    private readonly applicantModel: Model<EmployerApplicantDocument>,
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
  private scoreApplicant(app: EmployerApplicantDocument): number {
    const id =
      (app._id ? app._id.toString() : '') +
      (app.candidateEmail || app.candidateName || '');
    const stageComponent = this.stageWeight(app.stage) * 0.5; // up to 50
    const ratingComponent = Math.min(5, app.rating || 0) * 6; // up to 30
    const baseMatch = Math.min(100, app.aiScore || 0) * 0.1; // up to 10
    const jitter = this.seededUnit(`score:${id}`) * 10; // up to 10
    return Math.round(stageComponent + ratingComponent + baseMatch + jitter);
  }

  private rationaleFor(app: EmployerApplicantDocument, score: number): string {
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

    // Build proposed-action queue from applicants needing attention.
    const queue = applicants
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

    const activity = applicants.slice(0, 8).map((a) => ({
      applicantId: a._id ? a._id.toString() : null,
      name: a.candidateName || 'Candidate',
      event: a.stage === 'applied' ? 'received' : `moved_to_${a.stage}`,
      at: (a as any).updatedAt || (a as any).createdAt || new Date(),
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
      enabled: queue.length > 0,
      status: queue.length > 0 ? 'active' : 'idle',
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

  toggleAutopilot(enabled: boolean) {
    return {
      enabled,
      status: enabled ? 'active' : 'paused',
      message: enabled
        ? 'Autopilot enabled. Proposed actions will be generated for new applicants.'
        : 'Autopilot paused. No automated actions will be proposed.',
    };
  }

  // ---------------------------------------------------------------------------
  // Screen
  // ---------------------------------------------------------------------------

  async screen(ownerId: string, jobId?: string) {
    const query: any = { ownerId };
    if (jobId) query.jobId = jobId;

    const applicants = await this.applicantModel.find(query).exec();

    const ranked = applicants
      .map((a) => {
        const score = this.scoreApplicant(a);
        const recommendation =
          score >= 75 ? 'advance' : score >= 50 ? 'review' : 'hold';
        return {
          applicantId: a._id ? a._id.toString() : null,
          name: a.candidateName || 'Candidate',
          title: a.candidateHeadline || '',
          stage: a.stage || 'applied',
          score,
          recommendation,
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
  // Copilot (keyword-templated structured action response)
  // ---------------------------------------------------------------------------

  copilot(message: string) {
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
  // Sourcing (sample candidates + drafted outreach)
  // ---------------------------------------------------------------------------

  sourcing(brief: string) {
    const text = brief || '';
    const tokens = text
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .filter((t) => t.length > 2);
    const role = this.extractRole(text);

    const samplePool = [
      { name: 'Avery Chen', title: 'Senior Engineer', location: 'Remote', skills: ['typescript', 'react', 'node', 'aws'], years: 8 },
      { name: 'Jordan Patel', title: 'Product Designer', location: 'New York, NY', skills: ['figma', 'ux', 'prototyping', 'research'], years: 6 },
      { name: 'Sam Rivera', title: 'Data Scientist', location: 'Austin, TX', skills: ['python', 'ml', 'sql', 'pandas'], years: 5 },
      { name: 'Taylor Kim', title: 'Engineering Manager', location: 'Seattle, WA', skills: ['leadership', 'node', 'architecture', 'mentoring'], years: 11 },
      { name: 'Morgan Lee', title: 'Backend Engineer', location: 'Remote', skills: ['go', 'kubernetes', 'postgres', 'grpc'], years: 7 },
      { name: 'Casey Brooks', title: 'Recruiter', location: 'Chicago, IL', skills: ['sourcing', 'outreach', 'ats', 'closing'], years: 4 },
    ];

    const candidates = samplePool
      .map((c) => {
        const overlap = c.skills.filter((s) =>
          tokens.some((t) => s.includes(t) || t.includes(s)),
        ).length;
        const jitter = this.seededUnit(`source:${c.name}:${text}`) * 20;
        const score = Math.round(
          Math.min(100, 40 + overlap * 12 + Math.min(20, c.years) + jitter),
        );
        return {
          name: c.name,
          title: c.title,
          location: c.location,
          skills: c.skills,
          yearsExperience: c.years,
          matchScore: score,
          outreach: this.draftOutreach(c.name, role || c.title, c.skills),
        };
      })
      .sort((x, y) => y.matchScore - x.matchScore);

    return {
      brief: text,
      role: role || null,
      total: candidates.length,
      candidates,
    };
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
  // Interview scorecard (templated structured output)
  // ---------------------------------------------------------------------------

  scorecard(transcript?: string, notes?: string) {
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
