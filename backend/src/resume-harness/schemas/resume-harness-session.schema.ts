import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';
import { HARNESS_IDS, HarnessId } from '../harness/harness.types';

export type ResumeHarnessSessionDocument =
  HydratedDocument<ResumeHarnessSession>;

export type ResumeHarnessSessionStatus =
  'provisioning' | 'active' | 'ended' | 'failed';

/** One recorded exchange with the harness. */
@Schema({ _id: false })
export class ResumeHarnessTurn {
  @Prop({ default: '' })
  latex: string;

  @Prop()
  pdfKey?: string;

  @Prop()
  templateKey?: string;

  @Prop({ type: Object, default: {} })
  vibe: Record<string, string>;

  @Prop({ type: String, required: true, enum: ['instruction', 'look-change', 'restore'] })
  kind: 'instruction' | 'look-change' | 'restore';

  @Prop()
  restoredFromRevision?: number;

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

  /**
   * Ways the document still looks like scaffolding rather than a résumé, after
   * the repair budget ran out. A passing build is not the same as a finished
   * document, and this is where that difference is recorded.
   */
  @Prop({ type: [String], default: [] })
  contentWarnings?: string[];

  @Prop({ default: () => new Date() })
  createdAt: Date;
}

const ResumeHarnessTurnSchema = SchemaFactory.createForClass(ResumeHarnessTurn);

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
  @Prop({ trim: true, maxlength: 200 })
  name?: string;

  @Prop()
  pdfKey?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
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

  @Prop({
    required: true,
    enum: ['provisioning', 'active', 'ended', 'failed'],
    default: 'provisioning',
  })
  status: ResumeHarnessSessionStatus;

  /** Role this resume targets, if the candidate named one. */
  @Prop()
  targetRole?: string;

  /** Pasted job description to tailor against. */
  @Prop()
  jobDescription?: string;

  /**
   * The template this résumé is written to, by `ResumeTemplate.key`.
   *
   * Unlike `harness` this is freely changeable for the life of the session: a
   * template switch is a re-apply of content the session already holds, not a
   * rebind of a live sandbox. It is stored rather than derived so it survives a
   * reload and comes with the résumé into a new session on another harness.
   */
  @Prop()
  templateKey?: string;

  /** Knob choices in force, as `knobKey -> optionValue`. */
  @Prop({ type: Object, default: {} })
  vibe: Record<string, string>;

  /** Current LaTeX source. Survives teardown so it can seed the next session. */
  @Prop({ default: '' })
  latex: string;

  @Prop({ default: 0 })
  revision: number;

  @Prop({ default: false })
  compiled: boolean;

  @Prop()
  compileLog?: string;

  /**
   * Ways the current revision still looks like scaffolding rather than a
   * résumé. A passing build is not a finished document — filler typesets as
   * cleanly as a career — so this is where that difference is recorded.
   */
  @Prop({ type: [String], default: [] })
  contentWarnings?: string[];

  /**
   * The candidate's name at session creation.
   *
   * Kept here so a turn can check the document actually names them without
   * rebuilding the whole profile context on every turn.
   */
  @Prop()
  candidateName?: string;

  /** Exact source used by deterministic post-turn factual checks. */
  @Prop()
  candidateMarkdown?: string;

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

export const ResumeHarnessSessionSchema =
  SchemaFactory.createForClass(ResumeHarnessSession);

ResumeHarnessSessionSchema.index({ userId: 1, status: 1, createdAt: -1 });
ResumeHarnessSessionSchema.index({ userId: 1, updatedAt: -1 });
ResumeHarnessSessionSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['provisioning', 'active'] } },
    name: 'one_live_resume_harness_session_per_user',
  },
);
