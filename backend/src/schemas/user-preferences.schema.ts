import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type UserPreferencesDocument = UserPreferences & Document;

@Schema({ timestamps: true })
export class UserPreferences {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  titles?: string[];

  @Prop({ type: [String], default: [] })
  locations?: string[];

  @Prop({ type: Number, default: 0 })
  salaryMin?: number;

  @Prop({ type: Boolean, default: true })
  remoteOnly?: boolean;

  @Prop({ type: Boolean, default: false })
  visaSponsorshipNeeded?: boolean;

  // ---- Geographic eligibility (Stage 1 inputs) --------------------------
  @Prop({ type: String, default: '' })
  country?: string; // ISO2 current work country

  @Prop({ type: String, default: '' })
  region?: string; // state/province/city

  @Prop({ type: Boolean, default: false })
  willingToRelocate?: boolean;

  @Prop({ type: Boolean, default: false })
  internationalRelocation?: boolean;

  @Prop({ type: [String], default: [] })
  workAuthCountries?: string[]; // ISO2 countries where authorized to work

  // ---- Work arrangement -------------------------------------------------
  @Prop({ type: [String], default: [] })
  workplaceTypes?: string[]; // remote | hybrid | onsite | field

  @Prop({ type: String, default: '' })
  remoteScope?: string; // current_country | selected_countries | global | timezone

  // ---- Employment & compensation ----------------------------------------
  @Prop({ type: [String], default: [] })
  employmentTypes?: string[]; // full_time | part_time | contract | contract_to_hire | temporary | internship | freelance

  @Prop({ type: String, default: 'USD' })
  salaryCurrency?: string;

  @Prop({ type: String, default: 'year' })
  salaryPeriod?: string; // year | month | day | hour

  // ---- Industries & employers -------------------------------------------
  @Prop({ type: [String], default: [] })
  preferredIndustries?: string[];

  @Prop({ type: [String], default: [] })
  excludedIndustries?: string[];

  // ---- Exclusions -------------------------------------------------------
  @Prop({ type: [String], default: [] })
  excludedTitles?: string[];

  @Prop({ type: [String], default: [] })
  excludedKeywords?: string[];

  // ---- Recommendation controls ------------------------------------------
  @Prop({ type: Number, default: 60 })
  minMatchScore?: number;

  // ---- Auto-apply rules (distinct from recommendations) -----------------
  @Prop({ type: Boolean, default: false })
  autoApplyEnabled?: boolean; // OFF by default

  @Prop({ type: String, default: 'review_all' })
  autoApplyReviewMode?: string; // review_all | review_questions | none

  @Prop({ type: Number, default: 85 })
  autoApplyMinScore?: number;

  @Prop({ type: Number, default: 10 })
  autoApplyMaxDaily?: number;

  @Prop({ type: [String], default: [] })
  companyBlocklist?: string[];

  @Prop({ type: Boolean, default: false })
  speedFirst?: boolean; // true = auto-apply fast, false = require review

  @Prop({ type: Boolean, default: false })
  privacyMode?: boolean; // store API keys locally / minimal data usage

  @Prop({ type: Object, default: {} })
  notifications?: Record<string, boolean>; // email/product notification toggles
}

export const UserPreferencesSchema = SchemaFactory.createForClass(UserPreferences);

// userId already has a unique index via @Prop({ unique: true }).
