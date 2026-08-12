import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type AiProposedActionDocument = AiProposedAction & Document;
export type ProposedActionSource = 'copilot' | 'autopilot';
export type ProposedActionType =
  | 'advance_stage'
  | 'reject'
  | 'schedule_interview'
  | 'send_message';
export type ProposedActionStatus = 'pending' | 'approved' | 'rejected' | 'failed';

/**
 * A single-decision AI-proposed action awaiting employer approval.
 *
 * Deliberately NOT the same model as EmployerApproval, which represents
 * multi-step human approval CHAINS (Hiring Manager -> Finance -> VP) for
 * things like offer or budget requests. An AI proposal to move one applicant
 * to Interview needs exactly one yes/no from the employer, not a chain -
 * reusing EmployerApproval's generic `fields`/`chain` shape would mean
 * encoding structured, executable data into string pairs and parsing it back
 * out to execute, for no benefit.
 */
@Schema({ timestamps: true })
export class AiProposedAction {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ type: String, enum: ['copilot', 'autopilot'], required: true })
  source: ProposedActionSource;

  @Prop({
    type: String,
    enum: ['advance_stage', 'reject', 'schedule_interview', 'send_message'],
    required: true,
  })
  actionType: ProposedActionType;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'EmployerApplicant', required: true, index: true })
  applicantId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'EmployerJob', required: false })
  jobId?: Types.ObjectId;

  // Shape depends on actionType — see the plan's Task 2 for exactly which
  // fields each actionType reads:
  //   advance_stage: { targetStage: string }
  //   reject: {}
  //   schedule_interview: { type?: string, proposedAt?: string, durationMins?: number }
  //   send_message: { conversationId?: string, draftText: string }
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  payload: Record<string, any>;

  @Prop({ type: String, required: true })
  rationale: string;

  @Prop({ type: String, enum: ['pending', 'approved', 'rejected', 'failed'], default: 'pending', index: true })
  status: ProposedActionStatus;

  @Prop({ type: String, required: false })
  failureReason?: string;

  @Prop({ type: Date, required: false })
  decidedAt?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  decidedBy?: Types.ObjectId;
}

export const AiProposedActionSchema = SchemaFactory.createForClass(AiProposedAction);

AiProposedActionSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
// Idempotency lookup used by AutopilotRulesService (Task 4).
AiProposedActionSchema.index({ applicantId: 1, actionType: 1, source: 1 });
