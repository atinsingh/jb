import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type InterviewSessionDocument = InterviewSession & Document;

export enum InterviewMode {
  PRACTICE = 'PRACTICE',
  CONSENT = 'CONSENT',
  LIVE_NOTES = 'LIVE_NOTES',
}

export enum InterviewStatus {
  CREATED = 'CREATED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class InterviewSession {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: InterviewMode })
  mode: InterviewMode;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Resume', required: false })
  resumeVersionId?: Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Job' }], default: [] })
  jobDescriptionIds: Types.ObjectId[]; // Multiple if pasted

  @Prop({ required: true, maxlength: 140 })
  roleTitle: string;

  @Prop({ maxlength: 140 })
  companyName?: string;

  @Prop({ required: true, enum: InterviewStatus, default: InterviewStatus.CREATED })
  status: InterviewStatus;

  @Prop({ type: Object, required: false })
  contextPack?: Record<string, any>; // SessionContextPack JSON

  @Prop()
  startedAt?: Date;

  @Prop()
  endedAt?: Date;

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;

  // ---- Live capture: consent and retention ------------------------------

  /**
   * When the candidate acknowledged the consent notice for this session.
   *
   * Live capture takes SECOND-PARTY audio — the interviewer's voice. In
   * two-party-consent jurisdictions (California, Illinois, Washington,
   * Pennsylvania and Florida among them) that engages wiretap law. Unset means
   * capture has not been authorised and the gateway must refuse audio.
   */
  @Prop()
  consentAcknowledgedAt?: Date;

  /**
   * Whether the candidate opted into keeping the transcript after the session.
   *
   * Defaults to FALSE. Transcripts of a job interview are unusually sensitive —
   * they contain the candidate's unguarded speech and the employer's questions —
   * so retention is opt-in per session, never inherited from a global setting.
   */
  @Prop({ type: Boolean, default: false })
  retainTranscript?: boolean;

  /**
   * How audio reaches us. `tab_audio` is the browser tab share; `none` means a
   * text-only session (LIVE_NOTES).
   *
   * There is deliberately no value here for stored audio: raw frames are
   * transcribed in flight and dropped, so no capture mode implies persistence.
   */
  @Prop({ type: String, default: 'none' })
  captureMode?: string;
}

export const InterviewSessionSchema = SchemaFactory.createForClass(InterviewSession);

// Indexes
InterviewSessionSchema.index({ userId: 1, status: 1, createdAt: -1 });
InterviewSessionSchema.index({ userId: 1, mode: 1 });
InterviewSessionSchema.index({ resumeVersionId: 1 });

