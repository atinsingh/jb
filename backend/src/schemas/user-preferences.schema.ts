import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserPreferencesDocument = UserPreferences & Document;

@Schema({ timestamps: true })
export class UserPreferences {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
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

  @Prop({ type: [String], default: [] })
  companyBlocklist?: string[];

  @Prop({ type: Boolean, default: false })
  speedFirst?: boolean; // true = auto-apply fast, false = require review

  @Prop({ type: Boolean, default: false })
  privacyMode?: boolean; // store API keys locally / minimal data usage
}

export const UserPreferencesSchema = SchemaFactory.createForClass(UserPreferences);

UserPreferencesSchema.index({ userId: 1 }, { unique: true });
