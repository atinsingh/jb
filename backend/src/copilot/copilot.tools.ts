import { BadRequestException } from '@nestjs/common';
import { AgentTool, AgentToolContext } from '../agent-runtime/agent-runtime.types';
import { EligibleJobsService } from '../matching/eligible-jobs.service';
import { CoverLetterGeneratorService } from '../llm/features/cover-letter-generator.service';
import { ApplicationsService } from '../applications/applications.service';
import { ApplicationAgentService } from '../applications/application-agent.service';
import { ApplyRunnerService } from '../apply-runner/apply-runner.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Services the five Job-Search Copilot tools close over. Provided by the
 * registrar (real Nest providers) or by a spec (mocks) — the tool factory is
 * pure so it is trivially unit-testable in isolation.
 */
export interface CopilotToolDeps {
  eligibleJobs: EligibleJobsService;
  coverLetters: CoverLetterGeneratorService;
  applications: ApplicationsService;
  applicationAgent: ApplicationAgentService;
  applyRunner: ApplyRunnerService;
  notifications: NotificationsService;
}

/** The auto-apply match-score floor. Env-overridable; defaults to 75. */
export function minMatchScoreForAutoApply(): number {
  const raw = Number(process.env.MIN_MATCH_SCORE_FOR_AUTO_APPLY);
  return Number.isFinite(raw) && raw > 0 ? raw : 75;
}

/** Candidate context the controller seeds into the run input. */
interface CandidateContext {
  name?: string;
  email?: string;
  skills?: string[];
  summary?: string;
  experience?: string;
}

function candidateFrom(ctx: AgentToolContext): CandidateContext {
  const input: any = ctx.run?.input || {};
  return (input.candidate as CandidateContext) || {};
}

/**
 * Build the five Job-Search Copilot tools. Every handler is defensive: it
 * returns a compact, JSON-serialisable object and NEVER throws — expected
 * failure modes (caps, dedupe, disabled runner, LLM errors) resolve to a
 * `{skipped}` / `{error}` shape the agent can reason about and keep going.
 */
export function buildCopilotTools(deps: CopilotToolDeps): AgentTool[] {
  const findMatches: AgentTool = {
    name: 'find_matches',
    description:
      'Find job matches for the candidate, ranked by eligibility then fit. ' +
      'Returns compact matches with matchScore and eligibility.autoApplySafe. ' +
      'ONLY matches where autoApplySafe===true AND matchScore>=threshold are safe to apply to.',
    parameters: {
      type: 'object',
      properties: {
        keywords: { type: 'string', description: 'Optional keyword filter (title/company).' },
        limit: { type: 'number', description: 'Max matches to return (default 20).' },
      },
      required: [],
    },
    handler: async (ctx, args: any = {}) => {
      try {
        const res = await deps.eligibleJobs.getEligibleJobs(ctx.userId, {
          keywords: args.keywords,
          limit: args.limit ?? 20,
          includeConditional: true,
        });
        const matches = (res.jobs || []).map((j: any) => ({
          id: String(j.id),
          title: j.title,
          companyName: j.companyName,
          location: j.location,
          workplaceType: j.workplaceType,
          externalUrl: j.externalUrl,
          matchScore: j.matchScore,
          matchLabel: j.matchLabel,
          matchedSkills: j.matchedSkills,
          missingSkills: j.missingSkills,
          autoApplySafe: !!j.eligibility?.autoApplySafe,
          eligibilityStatus: j.eligibility?.status,
          eligibilityConfidence: j.eligibility?.confidence,
        }));
        return { matches, total: matches.length, threshold: minMatchScoreForAutoApply() };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err), matches: [] };
      }
    },
  };

  const writeCoverLetter: AgentTool = {
    name: 'write_cover_letter',
    description:
      'Write a tailored cover letter for a specific job. Returns { coverLetter }. ' +
      'Call this before apply when you want to include a letter.',
    parameters: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
        title: { type: 'string' },
        companyName: { type: 'string' },
        description: { type: 'string' },
        requirements: { type: 'array', items: { type: 'string' } },
      },
      required: ['jobId', 'title', 'companyName', 'description'],
    },
    handler: async (ctx, args: any) => {
      try {
        const cand = candidateFrom(ctx);
        const res = await deps.coverLetters.generateCoverLetter(
          ctx.userId,
          {
            name: cand.name || 'Candidate',
            email: cand.email || '',
            skills: cand.skills || [],
            experience: cand.experience,
            summary: cand.summary,
          },
          {
            title: args.title,
            companyName: args.companyName,
            description: args.description || '',
            requirements: args.requirements,
          },
        );
        return { jobId: String(args.jobId), coverLetter: res.finalLetter };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  };

  const apply: AgentTool = {
    name: 'apply',
    description:
      'Apply to a job on the candidate\'s behalf. Guardrails are enforced here: ' +
      'the daily cap and the match-score threshold. Real submission only happens ' +
      'when AUTO_APPLICATION_ENABLED is set; otherwise it is safely skipped. ' +
      'ONLY call this for matches with autoApplySafe===true.',
    parameters: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
        matchScore: { type: 'number' },
        coverLetter: { type: 'string', description: 'Optional; from write_cover_letter.' },
      },
      required: ['jobId'],
    },
    handler: async (ctx, args: any) => {
      try {
        // 1) Daily cap — hard stop before any work.
        const cap = await deps.applicationAgent.canApplyMore(ctx.userId);
        if (!cap.canApply) {
          return { skipped: 'daily cap reached', remaining: 0 };
        }

        // 2) Match-score threshold.
        const threshold = minMatchScoreForAutoApply();
        if (args.matchScore != null && args.matchScore < threshold) {
          return { skipped: 'below match threshold', threshold, matchScore: args.matchScore };
        }

        // 3) Cover letter: use the provided one; do not fabricate without job context.
        const coverLetter: string | undefined =
          typeof args.coverLetter === 'string' && args.coverLetter.trim()
            ? args.coverLetter
            : undefined;

        // 4) Create the application (dedupe-aware); MUST mark autoApplied.
        let app: any;
        try {
          app = await deps.applications.createApplication(
            ctx.userId,
            String(args.jobId),
            coverLetter,
            args.matchScore,
            true,
          );
        } catch (err) {
          if (err instanceof BadRequestException) {
            return { skipped: 'already applied', jobId: String(args.jobId) };
          }
          throw err;
        }

        // 5) Submit via the ATS runner (gated by AUTO_APPLICATION_ENABLED; never throws).
        const outcome = await deps.applyRunner.submitOne(String(app._id));
        return {
          applied: true,
          applicationId: String(app._id),
          jobId: String(args.jobId),
          status: outcome.status,
          ...(outcome.failReason ? { failReason: outcome.failReason } : {}),
          remaining: Math.max(0, cap.remaining - 1),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  };

  const listApplications: AgentTool = {
    name: 'list_applications',
    description:
      'List the candidate\'s applications (optionally filtered by status) plus summary stats. ' +
      'Use this to track progress and avoid re-applying.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Optional status filter (e.g. pending, submitted).' },
      },
      required: [],
    },
    handler: async (ctx, args: any = {}) => {
      try {
        const [apps, stats] = await Promise.all([
          deps.applications.getUserApplications(ctx.userId, args.status),
          deps.applications.getApplicationStats(ctx.userId).catch(() => undefined),
        ]);
        const applications = (apps || []).slice(0, 50).map((a: any) => ({
          id: String(a._id),
          jobId: a.jobId && a.jobId._id ? String(a.jobId._id) : String(a.jobId),
          title: a.jobId && a.jobId.title ? a.jobId.title : undefined,
          companyName: a.jobId && a.jobId.companyName ? a.jobId.companyName : undefined,
          status: a.status,
          matchScore: a.matchScore,
          autoApplied: a.autoApplied,
          appliedAt: a.appliedAt,
        }));
        return { applications, total: applications.length, stats };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err), applications: [] };
      }
    },
  };

  const followUp: AgentTool = {
    name: 'follow_up',
    description:
      'Notify the candidate with a short update (e.g. what was applied to, or a next step). ' +
      'Writes a candidate notification.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The notification text.' },
        href: { type: 'string', description: 'Optional in-app link; defaults to /app/applications.' },
      },
      required: ['text'],
    },
    handler: async (ctx, args: any) => {
      try {
        await deps.notifications.create({
          audience: 'candidate',
          userId: ctx.userId,
          type: 'applications',
          text: String(args.text),
          href: args.href || '/app/applications',
        });
        return { notified: true };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  };

  return [findMatches, writeCoverLetter, apply, listApplications, followUp];
}
