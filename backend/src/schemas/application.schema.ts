import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type ApplicationDocument = Application & Document;

@Schema({ timestamps: true })
export class Application {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  candidateId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Job', required: true })
  jobId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'JobProfile', required: false })
  profileId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  agentId?: Types.ObjectId; // Agent who applied on behalf

  @Prop({ enum: ['ai', 'human', 'self'], default: 'self' })
  appliedBy?: string; // Who applied: ai agent, human agent, or candidate themselves

  @Prop({ default: 0 })
  matchScore?: number;

  @Prop({ default: '' })
  coverLetter?: string;

  @Prop({ default: '' })
  resume?: string;

  @Prop({ default: '' })
  source?: string; // e.g. Indeed, LinkedIn, Greenhouse

  @Prop({ default: '' })
  atsType?: string; // e.g. greenhouse, lever, workday

  @Prop({ type: Object, default: {} })
  artifacts?: {
    screenshotUrl?: string;
    formJsonUrl?: string;
    resumeVersionId?: Types.ObjectId;
    coverLetterVersionId?: Types.ObjectId;
  };

  @Prop({ default: '' })
  failReason?: string;

  @Prop({ type: Object, default: {} })
  atsMetadata?: Record<string, any>;

  @Prop({
    enum: [
      'pending',
      'submitted',
      // NOTE: `reviewing` means the EMPLOYER is reviewing a submitted
      // application. It is NOT the candidate-approval state — that is
      // `awaiting_approval`. Conflating them would corrupt the tracker.
      'reviewing',
      'interviewed',
      'rejected',
      'accepted',
      // Prepare -> approve lifecycle:
      'preparing', // runner is filling the form right now
      'awaiting_approval', // filled and parked; the candidate must approve
      'declined', // the CANDIDATE chose not to send it (distinct from `rejected`,
      //           which means the EMPLOYER turned them down)
      'expired', // the prepared form went stale (TTL or job closed)
      // Auto-apply terminal outcomes:
      'failed', // submission attempt errored (retryable)
      'needs_human', // blocked (CAPTCHA / unknown ATS / complex form) — needs manual completion
    ],
    default: 'pending',
  })
  status?: string;

  /**
   * Everything produced by the prepare pass, held until the candidate approves.
   *
   * The bulky parts live in storage (`artifacts.formJsonUrl` for the introspected
   * schema, `artifacts.screenshotUrl` for the filled-form proof); only the small
   * state that has to be queried stays inline here.
   */
  @Prop({ type: Object, default: undefined })
  prepared?: {
    /** Structure hash, re-checked before submitting. */
    fingerprint?: string;
    /** Resolved answers: { fieldName, questionKey, value, source, confidence }. */
    answers?: Array<Record<string, any>>;
    /** Questions only the candidate can clear. Non-empty = not approvable. */
    blockers?: Array<Record<string, any>>;
    /** Labels we had never seen before; learned once answered. */
    unknownQuestions?: string[];
    /** Fraction of fields the adapter actually filled — selector-rot signal. */
    fillCoverage?: number;
    preparedAt?: Date;
    expiresAt?: Date;
    /** Set ONLY by an explicit candidate approval. No approval, no submit. */
    approvalId?: string;
    approvedAt?: Date;
  };

  @Prop({ default: false })
  autoApplied?: boolean;

  @Prop({ default: Date.now })
  appliedAt?: Date;

  @Prop()
  submittedAt?: Date;

  @Prop({ default: '' })
  notes?: string;

  @Prop({ default: '' })
  agentNotes?: string; // Notes from the agent

  @Prop({ type: [String], default: [] })
  proofDocuments?: string[]; // URLs to proof documents (screenshots, confirmation emails, etc.)

  @Prop()
  proofSubmittedAt?: Date;

  @Prop({
    type: [
      {
        status: String,
        timestamp: Date,
        notes: String,
        changedBy: String, // 'system', 'user', 'agent'
      },
    ],
    default: [],
  })
  statusTimeline?: Array<{
    status: string;
    timestamp: Date;
    notes?: string;
    changedBy?: string;
  }>;
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);

// Add indexes
ApplicationSchema.index({ candidateId: 1, jobId: 1 });
ApplicationSchema.index({ status: 1 });
ApplicationSchema.index({ appliedAt: -1 });
ApplicationSchema.index({ agentId: 1 });
ApplicationSchema.index({ candidateId: 1, agentId: 1 });
// The approval queue reads this on every page load, and the trigger job counts
// against it to enforce MAX_UNREVIEWED_PREPARES.
ApplicationSchema.index({ candidateId: 1, status: 1, 'prepared.preparedAt': -1 });
// Expiry sweep over parked applications.
ApplicationSchema.index({ status: 1, 'prepared.expiresAt': 1 });
