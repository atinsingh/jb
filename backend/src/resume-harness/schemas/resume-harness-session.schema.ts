import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';
import { HARNESS_IDS, HarnessId } from '../harness/harness.types';

export type ResumeHarnessSessionDocument =
  HydratedDocument<ResumeHarnessSession>;

export type ResumeHarnessSessionStatus = 'active' | 'ended' | 'failed';

/** One recorded exchange with the harness. */
@Schema({ _id: false })
export class ResumeHarnessTurn {
  @Prop({ required: true })
  instruction: string;

  @Prop({ required: true })
  revision: number;

  @Prop({ default: false })
  compiled: boolean;

  /** Compiler errors, when the turn ended on a failed build. */
  @Prop()
  compileLog?: string;

  /** The harness's own one-line summary of what it changed. */
  @Prop()
  summary?: string;

  @Prop({ default: () => new Date() })
  createdAt: Date;
}

const ResumeHarnessTurnSchema =
  SchemaFactory.createForClass(ResumeHarnessTurn);

/**
 * A resume-generation session: one user, one harness, one sandbox.
 *
 * `harness` is written once at creation and never updated. Swapping it would
 * mean re-binding a live sandbox and re-hydrating agent state; since `latex` is
 * persisted here, "start a new session and carry the artifact forward" reaches
 * the same place for near-zero cost, so the mutable case simply does not exist.
 */
@Schema({ timestamps: true, collection: 'resume_harness_sessions' })
export class ResumeHarnessSession {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  // `type: String` is explicit because `HarnessId` is a union and Mongoose
  // cannot infer a schema type from it.
  @Prop({ type: String, required: true, enum: HARNESS_IDS, immutable: true })
  harness: HarnessId;

  /** The one sandbox bound to this session. */
  @Prop({ index: true })
  sandboxId?: string;

  // --- resolved at creation from the user's tier, recorded for display ---
  @Prop({ required: true })
  alias: string;

  @Prop({ required: true })
  provider: string;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true })
  effort: string;

  @Prop({ required: true })
  modelLabel: string;

  /** Tier at creation time, kept so a later plan change is visible in support. */
  @Prop()
  tier?: string;

  @Prop({ required: true, enum: ['active', 'ended', 'failed'], default: 'active' })
  status: ResumeHarnessSessionStatus;

  /** Role this resume targets, if the candidate named one. */
  @Prop()
  targetRole?: string;

  /** Pasted job description to tailor against. */
  @Prop()
  jobDescription?: string;

  /** Current LaTeX source. Survives teardown so it can seed the next session. */
  @Prop({ default: '' })
  latex: string;

  @Prop({ default: 0 })
  revision: number;

  @Prop({ default: false })
  compiled: boolean;

  @Prop()
  compileLog?: string;

  /** The session this one carried its artifact forward from, if any. */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ResumeHarnessSession' })
  carriedFrom?: Types.ObjectId;

  @Prop({ type: [ResumeHarnessTurnSchema], default: [] })
  turns: ResumeHarnessTurn[];

  @Prop()
  endedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ResumeHarnessSessionSchema = SchemaFactory.createForClass(
  ResumeHarnessSession,
);

ResumeHarnessSessionSchema.index({ userId: 1, status: 1, createdAt: -1 });
