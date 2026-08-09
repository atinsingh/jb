import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type AnswerProfileDocument = AnswerProfile & Document;

/**
 * What a candidate has declared about their right to work in a country.
 * These are LEGAL ATTESTATIONS — see ATTESTATION_FIELDS below.
 */
export enum WorkAuthStatus {
  AUTHORIZED = 'authorized', // may work there today, no sponsorship needed
  REQUIRES_SPONSORSHIP = 'requires_sponsorship', // may work there only with sponsorship
  NOT_AUTHORIZED = 'not_authorized', // may not work there
}

/** Every EEO/demographic question defaults to this. */
export const DECLINE = 'decline_to_answer';

/** How a stored value came to be. */
export enum AnswerSource {
  CANDIDATE = 'candidate', // typed or chosen by the candidate themselves
  AI_DRAFT = 'ai_draft', // drafted by a model, pending candidate review
  IMPORTED = 'imported', // carried over from résumé/profile parsing
}

/**
 * Fields that may ONLY ever be written with `AnswerSource.CANDIDATE`.
 *
 * These are statements of legal fact made in the candidate's name on a real job
 * application: immigration status, age, criminal history, clearance, and the
 * protected-characteristic block. A model must never infer any of them — not
 * because the output would be low quality, but because a fabricated attestation
 * submitted to an employer is a lie told on someone else's behalf.
 *
 * `AnswerProfileService.update` enforces this; `answer-resolver` refuses to send
 * questions that map here to an LLM at all.
 */
export const ATTESTATION_FIELDS: readonly string[] = Object.freeze([
  'workAuthorization',
  'isAtLeast18',
  'hasWorkRestrictions',
  'criminalConvictionDisclosure',
  'securityClearance',
  'eeoGender',
  'eeoEthnicity',
  'eeoVeteranStatus',
  'eeoDisabilityStatus',
]);

export const isAttestationField = (field: string): boolean =>
  ATTESTATION_FIELDS.includes(String(field || '').split('.')[0]);

@Schema({ timestamps: true })
export class AnswerProfile {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  // ---- Attestations: candidate-stated only ------------------------------

  /**
   * ISO2 country -> {@link WorkAuthStatus}. A map rather than a sentence,
   * because "are you authorized to work in X?" is asked per country and the
   * answer differs per country.
   */
  @Prop({ type: Object, default: {} })
  workAuthorization?: Record<string, WorkAuthStatus>;

  @Prop({ type: Boolean })
  isAtLeast18?: boolean;

  @Prop({ type: Boolean })
  hasWorkRestrictions?: boolean;

  @Prop({ type: String })
  criminalConvictionDisclosure?: string; // 'none' | 'disclosed' | DECLINE

  @Prop({ type: String })
  securityClearance?: string; // 'none' | free text the candidate entered

  // ---- EEO / demographics: always default to declining ------------------

  @Prop({ type: String, default: DECLINE })
  eeoGender?: string;

  @Prop({ type: String, default: DECLINE })
  eeoEthnicity?: string;

  @Prop({ type: String, default: DECLINE })
  eeoVeteranStatus?: string;

  @Prop({ type: String, default: DECLINE })
  eeoDisabilityStatus?: string;

  // ---- Preferences: candidate-stated, not legally binding ---------------

  @Prop({ type: Number })
  noticePeriodDays?: number;

  @Prop({ type: Date })
  earliestStartDate?: Date;

  @Prop({ type: Number })
  salaryExpectationAmount?: number;

  @Prop({ type: String, default: 'USD' })
  salaryExpectationCurrency?: string;

  @Prop({ type: String, default: 'year' })
  salaryExpectationPeriod?: string; // year | month | day | hour

  @Prop({ type: Boolean })
  willingToRelocate?: boolean;

  @Prop({ type: Number })
  willingToTravelPercent?: number;

  // ---- Contact & links ---------------------------------------------------

  @Prop({ type: String }) preferredName?: string;
  @Prop({ type: String }) phone?: string;
  @Prop({ type: String }) addressCity?: string;
  @Prop({ type: String }) addressRegion?: string;
  @Prop({ type: String }) addressCountry?: string; // ISO2
  @Prop({ type: String }) linkedinUrl?: string;
  @Prop({ type: String }) githubUrl?: string;
  @Prop({ type: String }) portfolioUrl?: string;
  @Prop({ type: String }) websiteUrl?: string;

  /**
   * Provenance for every stored field: `{ [fieldPath]: { source, updatedAt } }`.
   * Kept so the review UI can show where an answer came from, and so an audit
   * can prove no attestation was machine-written.
   */
  @Prop({ type: Object, default: {} })
  fieldSources?: Record<string, { source: AnswerSource; updatedAt: Date }>;
}

export const AnswerProfileSchema = SchemaFactory.createForClass(AnswerProfile);

// userId already has a unique index via @Prop({ unique: true }).
