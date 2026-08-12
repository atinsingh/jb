import { Model, Types } from 'mongoose';
import { AgentTool, AgentToolContext } from '../../agent-runtime/agent-runtime.types';
import { EmployerApplicantDocument } from '../../employer-pipeline/schemas/employer-applicant.schema';
import { EmployerAiActionsService } from '../employer-ai-actions.service';

export interface RecruiterCopilotToolDeps {
  applicantModel: Model<EmployerApplicantDocument>;
  actionsService: EmployerAiActionsService;
}

function toApplicantSummary(app: any) {
  return {
    id: app._id.toString(),
    name: app.candidateName || 'Unknown',
    stage: app.stage,
    skills: app.skills || [],
    aiScore: app.aiScore || 0,
    rating: app.rating || 0,
  };
}

export function buildRecruiterCopilotTools(deps: RecruiterCopilotToolDeps): AgentTool[] {
  const searchApplicants: AgentTool = {
    name: 'search_applicants',
    description:
      'Search this employer\'s applicants, optionally filtered by job, stage, or minimum score. Read-only — use this or get_applicant_detail before proposing any action on a named candidate, to ground the name to a real applicant id.',
    parameters: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Optional EmployerJob id to filter by' },
        stage: { type: 'string', description: 'Optional stage filter: applied|screening|interview|offer|hired|rejected' },
        minScore: { type: 'number', description: 'Optional minimum aiScore filter' },
        limit: { type: 'number', description: 'Max results, default 20' },
      },
      required: [],
    },
    handler: async (ctx: AgentToolContext, args: any = {}) => {
      try {
        const query: any = { ownerId: new Types.ObjectId(ctx.userId) };
        // jobId is left as a raw string (not manually cast to ObjectId): the
        // EmployerApplicant schema types jobId as ObjectId, so Mongoose casts
        // filter values against the schema automatically on a real query —
        // and it also lets this tool tolerate a non-ObjectId jobId (e.g. from
        // an LLM tool call) by degrading to zero matches instead of throwing.
        if (args.jobId) query.jobId = args.jobId;
        if (args.stage) query.stage = args.stage;
        if (typeof args.minScore === 'number') query.aiScore = { $gte: args.minScore };

        const applicants = await deps.applicantModel
          .find(query)
          .limit(args.limit || 20)
          .lean();

        return { applicants: applicants.map(toApplicantSummary) };
      } catch (err: any) {
        return { error: err?.message || 'Search failed', applicants: [] };
      }
    },
  };

  const getApplicantDetail: AgentTool = {
    name: 'get_applicant_detail',
    description: 'Get one applicant\'s full record by id, including stage history and notes.',
    parameters: {
      type: 'object',
      properties: { applicantId: { type: 'string' } },
      required: ['applicantId'],
    },
    handler: async (ctx: AgentToolContext, args: any = {}) => {
      try {
        const applicant = await deps.applicantModel
          .findOne({ _id: args.applicantId, ownerId: new Types.ObjectId(ctx.userId) })
          .lean();
        if (!applicant) return { error: 'Applicant not found' };
        return { applicant: { ...toApplicantSummary(applicant), notes: (applicant as any).notes || [] } };
      } catch (err: any) {
        return { error: err?.message || 'Lookup failed' };
      }
    },
  };

  const getJobStats: AgentTool = {
    name: 'get_job_stats',
    description: 'Funnel counts (applied/screening/interview/offer/hired/rejected) for one job.',
    parameters: {
      type: 'object',
      properties: { jobId: { type: 'string' } },
      required: ['jobId'],
    },
    handler: async (ctx: AgentToolContext, args: any = {}) => {
      try {
        const stages = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];
        const counts: Record<string, number> = {};
        for (const stage of stages) {
          counts[stage] = await deps.applicantModel.countDocuments({
            ownerId: new Types.ObjectId(ctx.userId),
            jobId: new Types.ObjectId(args.jobId),
            stage,
          });
        }
        return { counts };
      } catch (err: any) {
        return { error: err?.message || 'Stats lookup failed' };
      }
    },
  };

  const proposeAdvanceStage: AgentTool = {
    name: 'propose_advance_stage',
    description:
      'Propose advancing a named applicant to a new stage. Creates a pending approval — does NOT change anything until the employer confirms. applicantId must come from search_applicants or get_applicant_detail, never guessed.',
    parameters: {
      type: 'object',
      properties: {
        applicantId: { type: 'string' },
        targetStage: { type: 'string', description: 'screening|interview|offer|hired' },
        rationale: { type: 'string' },
      },
      required: ['applicantId', 'targetStage', 'rationale'],
    },
    handler: async (ctx: AgentToolContext, args: any = {}) => {
      try {
        const proposal = await deps.actionsService.create({
          ownerId: ctx.userId,
          source: 'copilot',
          actionType: 'advance_stage',
          applicantId: args.applicantId,
          payload: { targetStage: args.targetStage },
          rationale: args.rationale,
        });
        return { proposedActionId: (proposal as any)._id.toString(), summary: `Proposed advancing to ${args.targetStage}, awaiting your approval.` };
      } catch (err: any) {
        return { error: err?.message || 'Could not create proposal' };
      }
    },
  };

  const proposeReject: AgentTool = {
    name: 'propose_reject',
    description:
      'Propose rejecting a named applicant. Creates a pending approval — does NOT change anything until the employer confirms.',
    parameters: {
      type: 'object',
      properties: {
        applicantId: { type: 'string' },
        rationale: { type: 'string' },
      },
      required: ['applicantId', 'rationale'],
    },
    handler: async (ctx: AgentToolContext, args: any = {}) => {
      try {
        const proposal = await deps.actionsService.create({
          ownerId: ctx.userId,
          source: 'copilot',
          actionType: 'reject',
          applicantId: args.applicantId,
          payload: {},
          rationale: args.rationale,
        });
        return { proposedActionId: (proposal as any)._id.toString(), summary: 'Proposed rejecting this applicant, awaiting your approval.' };
      } catch (err: any) {
        return { error: err?.message || 'Could not create proposal' };
      }
    },
  };

  const proposeScheduleInterview: AgentTool = {
    name: 'propose_schedule_interview',
    description:
      'Propose scheduling an interview for a named applicant. Creates a pending approval — no interview is actually scheduled until the employer confirms.',
    parameters: {
      type: 'object',
      properties: {
        applicantId: { type: 'string' },
        type: { type: 'string', description: 'phone|video|onsite' },
        proposedAt: { type: 'string', description: 'ISO 8601 datetime' },
        durationMins: { type: 'number' },
        rationale: { type: 'string' },
      },
      required: ['applicantId', 'rationale'],
    },
    handler: async (ctx: AgentToolContext, args: any = {}) => {
      try {
        const proposal = await deps.actionsService.create({
          ownerId: ctx.userId,
          source: 'copilot',
          actionType: 'schedule_interview',
          applicantId: args.applicantId,
          payload: { type: args.type, proposedAt: args.proposedAt, durationMins: args.durationMins },
          rationale: args.rationale,
        });
        return { proposedActionId: (proposal as any)._id.toString(), summary: 'Proposed an interview time, awaiting your approval.' };
      } catch (err: any) {
        return { error: err?.message || 'Could not create proposal' };
      }
    },
  };

  const proposeSendMessage: AgentTool = {
    name: 'propose_send_message',
    description:
      'Draft an outreach message to a named applicant. Creates a pending approval — the employer sees and can edit the exact text before it can send.',
    parameters: {
      type: 'object',
      properties: {
        applicantId: { type: 'string' },
        draftText: { type: 'string' },
        rationale: { type: 'string' },
      },
      required: ['applicantId', 'draftText', 'rationale'],
    },
    handler: async (ctx: AgentToolContext, args: any = {}) => {
      try {
        const proposal = await deps.actionsService.create({
          ownerId: ctx.userId,
          source: 'copilot',
          actionType: 'send_message',
          applicantId: args.applicantId,
          payload: { draftText: args.draftText },
          rationale: args.rationale,
        });
        return { proposedActionId: (proposal as any)._id.toString(), summary: 'Drafted a message, awaiting your approval before it sends.' };
      } catch (err: any) {
        return { error: err?.message || 'Could not create proposal' };
      }
    },
  };

  return [
    searchApplicants,
    getApplicantDetail,
    getJobStats,
    proposeAdvanceStage,
    proposeReject,
    proposeScheduleInterview,
    proposeSendMessage,
  ];
}
