import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QuestionCatalogDocument = QuestionCatalog & Document;

/**
 * What KIND of question this is — which decides what is allowed to answer it.
 *
 * This classification is the safety model. An ATTESTATION can only ever be
 * answered from the candidate's own stated facts; PROSE is the only class a
 * model may author.
 */
export enum QuestionClass {
  /** Legal/factual statement made in the candidate's name. Never AI. */
  ATTESTATION = 'attestation',
  /** Candidate preference — salary, notice, start date. From profile. */
  PREFERENCE = 'preference',
  /** EEO / protected characteristics. From profile, defaults to declining. */
  DEMOGRAPHIC = 'demographic',
  /** Free text where judgement is wanted — "why this company?". AI may draft. */
  PROSE = 'prose',
  /** Résumé / cover letter / portfolio upload. Handled by the builders. */
  FILE = 'file',
  /** Plain contact details — name, email, phone, links. */
  IDENTITY = 'identity',
}

/**
 * Global mapping from a normalized question to the profile field that answers
 * it. Contains NO candidate data — only question patterns — so one catalog
 * serves every account and a question learned once benefits everyone.
 *
 * Without this, every candidate would hand-answer the same ~40 questions that
 * appear on nearly every ATS form.
 */
@Schema({ timestamps: true })
export class QuestionCatalog {
  /** Normalized key produced by the question normalizer. */
  @Prop({ type: String, required: true, unique: true, index: true })
  questionKey: string;

  /** Human-readable canonical phrasing, shown in the review UI. */
  @Prop({ type: String, required: true })
  canonicalText: string;

  /**
   * Additional normalized fragments that should resolve to this key. Matched as
   * plain substrings against the normalized question — deliberately not regex,
   * so a bad seed cannot become a catastrophic backtrack.
   */
  @Prop({ type: [String], default: [] })
  patterns?: string[];

  @Prop({ type: String, enum: Object.values(QuestionClass), required: true })
  questionClass: QuestionClass;

  /** Dotted path into `AnswerProfile` that satisfies this question, if any. */
  @Prop({ type: String })
  profileField?: string;

  /**
   * True when the answer depends on a country named in the question itself
   * (e.g. "authorized to work in Canada?" -> workAuthorization.CA).
   */
  @Prop({ type: Boolean, default: false })
  countryScoped?: boolean;

  @Prop({ type: Number, default: 0 })
  timesSeen?: number;

  @Prop({ type: Boolean, default: true })
  active?: boolean;
}

export const QuestionCatalogSchema = SchemaFactory.createForClass(QuestionCatalog);

QuestionCatalogSchema.index({ active: 1 });
