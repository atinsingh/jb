import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AiProposedAction,
  AiProposedActionDocument,
  ProposedActionSource,
  ProposedActionStatus,
  ProposedActionType,
} from './schemas/ai-proposed-action.schema';
import { EmployerPipelineService } from '../employer-pipeline/employer-pipeline.service';
import { EmployerInterviewsService } from '../employer-interviews/employer-interviews.service';
import { EmployerMessagesService } from '../employer-messages/employer-messages.service';

export interface CreateProposedActionInput {
  ownerId: string;
  source: ProposedActionSource;
  actionType: ProposedActionType;
  applicantId: string;
  jobId?: string;
  payload: Record<string, any>;
  rationale: string;
}

@Injectable()
export class EmployerAiActionsService {
  private readonly logger = new Logger(EmployerAiActionsService.name);

  constructor(
    @InjectModel(AiProposedAction.name)
    private readonly proposedActionModel: Model<AiProposedActionDocument>,
    private readonly pipelineService: EmployerPipelineService,
    private readonly interviewsService: EmployerInterviewsService,
    private readonly messagesService: EmployerMessagesService,
  ) {}

  async create(input: CreateProposedActionInput): Promise<AiProposedActionDocument> {
    // Structural tenant-ownership guard: a proposal may only ever be created
    // for an applicant this owner actually has. `findOne` throws
    // NotFoundException when no applicant matches {_id, ownerId}; letting it
    // propagate is the intended behaviour. This is a second layer of defense
    // behind the per-tool checks in recruiter-copilot.tools.ts, and it also
    // covers every future caller without relying on caller discipline.
    await this.pipelineService.findOne(input.ownerId, input.applicantId);

    return this.proposedActionModel.create({
      ownerId: new Types.ObjectId(input.ownerId),
      source: input.source,
      actionType: input.actionType,
      applicantId: new Types.ObjectId(input.applicantId),
      jobId: input.jobId ? new Types.ObjectId(input.jobId) : undefined,
      payload: input.payload,
      rationale: input.rationale,
    });
  }

  async list(
    ownerId: string,
    status?: ProposedActionStatus,
  ): Promise<AiProposedActionDocument[]> {
    const query: any = { ownerId: new Types.ObjectId(ownerId) };
    if (status) query.status = status;
    return this.proposedActionModel.find(query).sort({ createdAt: -1 }).exec();
  }

  /**
   * The idempotency check AutopilotRulesService (Task 4) uses before
   * creating a new proposal: any row at all — pending or already decided —
   * for this (applicant, actionType, source) blocks a duplicate.
   */
  async existsFor(
    applicantId: string,
    actionType: ProposedActionType,
    source: ProposedActionSource,
  ): Promise<boolean> {
    const found = await this.proposedActionModel
      .findOne({
        applicantId: new Types.ObjectId(applicantId),
        actionType,
        source,
      })
      .exec();
    return !!found;
  }

  async decide(
    ownerId: string,
    id: string,
    decision: 'approve' | 'reject',
    decidedBy: string,
  ): Promise<AiProposedActionDocument> {
    const proposal = await this.proposedActionModel
      .findOne({ _id: id, ownerId: new Types.ObjectId(ownerId) })
      .exec();
    if (!proposal) {
      throw new NotFoundException('Proposed action not found');
    }
    if (proposal.status !== 'pending') {
      throw new ConflictException(
        `Proposal ${id} has already been decided (status: ${proposal.status})`,
      );
    }

    proposal.decidedAt = new Date();
    proposal.decidedBy = new Types.ObjectId(decidedBy);

    if (decision === 'reject') {
      proposal.status = 'rejected';
      return proposal.save();
    }

    try {
      await this.execute(ownerId, proposal);
      proposal.status = 'approved';
    } catch (error: any) {
      this.logger.warn(
        `Approved proposal ${proposal._id} failed to execute: ${error?.message || error}`,
      );
      proposal.status = 'failed';
      proposal.failureReason = error?.message || 'Unknown error';
    }

    return proposal.save();
  }

  private async execute(
    ownerId: string,
    proposal: AiProposedActionDocument,
  ): Promise<void> {
    const applicantId = proposal.applicantId.toString();

    switch (proposal.actionType) {
      case 'advance_stage': {
        const targetStage = proposal.payload?.targetStage;
        if (!targetStage) throw new Error('Missing targetStage in proposal payload');
        await this.pipelineService.updateStage(ownerId, applicantId, targetStage);
        return;
      }
      case 'reject': {
        await this.pipelineService.updateStage(ownerId, applicantId, 'rejected');
        return;
      }
      case 'schedule_interview': {
        await this.interviewsService.create(ownerId, {
          applicantId,
          type: proposal.payload?.type,
          scheduledAt: proposal.payload?.proposedAt,
          durationMins: proposal.payload?.durationMins,
        } as any);
        return;
      }
      case 'send_message': {
        let conversationId = proposal.payload?.conversationId;
        if (!conversationId) {
          // Resolve the REAL candidate identity — a conversation created with
          // a hardcoded "Candidate" placeholder and no candidateId is
          // orphaned: EmployerMessagesService.sendMessage only notifies the
          // candidate when conversation.candidateId is set.
          const applicant: any = await this.pipelineService.findOne(
            ownerId,
            applicantId,
          );
          const candidateId = applicant?.candidateId
            ? String(applicant.candidateId)
            : undefined;

          // Reuse an existing thread with this candidate when there is one —
          // EmployerMessagesService exposes no candidate-keyed lookup, so
          // filter its owner-scoped list rather than always forking a new
          // conversation on every approved message.
          let existing: any = null;
          if (candidateId) {
            const conversations = await this.messagesService.listConversations(ownerId);
            existing = (conversations || []).find(
              (c: any) => c.candidateId && String(c.candidateId) === candidateId,
            );
          }

          const conversation =
            existing ||
            (await this.messagesService.createConversation(ownerId, {
              candidateName: applicant?.candidateName || 'Candidate',
              candidateId,
            } as any));
          conversationId = (conversation as any)._id.toString();
        }
        await this.messagesService.sendMessage(ownerId, conversationId, {
          body: proposal.payload?.draftText || '',
        } as any);
        return;
      }
      default:
        throw new Error(`Unknown actionType: ${proposal.actionType}`);
    }
  }
}
