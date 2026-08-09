import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { AnswerSource } from './answer-profile.schema';

export type AnswerBankDocument = AnswerBank & Document;

/** The shape of the form control an answer was given for. */
export enum AnswerType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  BOOLEAN = 'boolean',
  NUMBER = 'number',
  DATE = 'date',
  FILE = 'file',
}

/**
 * One remembered answer, per candidate, per normalized question.
 *
 * This is what makes the second application nearly free. The first time a form
 * asks something the system cannot resolve, the candidate answers it once in
 * the approval queue; every later form asking the same question — at a
 * different company, worded differently — resolves from here without asking
 * again.
 *
 * Keyed on the NORMALIZED question (see question-normalizer), not the raw text,
 * so "Are you legally authorized to work in the US?" and "Do you have US work
 * authorization?" collapse to one row.
 */
@Schema({ timestamps: true })
export class AnswerBank {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  questionKey: string;

  /** Verbatim question texts this key has been seen as (bounded, for debugging). */
  @Prop({ type: [String], default: [] })
  rawSamples?: string[];

  /** string | string[] | boolean | number — shape depends on `answerType`. */
  @Prop({ type: MongooseSchema.Types.Mixed })
  value?: any;

  @Prop({ type: String, enum: Object.values(AnswerType), default: AnswerType.TEXT })
  answerType?: AnswerType;

  @Prop({ type: String, enum: Object.values(AnswerSource), default: AnswerSource.CANDIDATE })
  source?: AnswerSource;

  /** 0..1. Candidate-given answers are 1; mapped/drafted answers score lower. */
  @Prop({ type: Number, default: 1 })
  confidence?: number;

  @Prop({ type: Number, default: 0 })
  timesUsed?: number;

  @Prop({ type: Date })
  lastUsedAt?: Date;

  /** Last time the candidate explicitly confirmed this is still true. */
  @Prop({ type: Date })
  lastConfirmedAt?: Date;
}

export const AnswerBankSchema = SchemaFactory.createForClass(AnswerBank);

// One remembered answer per question, per candidate.
AnswerBankSchema.index({ userId: 1, questionKey: 1 }, { unique: true });
AnswerBankSchema.index({ userId: 1, lastUsedAt: -1 });
