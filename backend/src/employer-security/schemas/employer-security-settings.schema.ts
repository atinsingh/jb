import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type EmployerSecuritySettingsDocument = EmployerSecuritySettings & Document;

@Schema({ timestamps: true })
export class EmployerSecuritySettings {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true })
  ownerId: Types.ObjectId;

  @Prop({ enum: ['okta', 'azure', 'google', ''], default: '' })
  idp: string;

  @Prop({ default: '' })
  ssoMetadataUrl: string;

  @Prop({ default: false })
  enforceSso: boolean;

  @Prop({ default: false })
  scimEnabled: boolean;

  @Prop({ default: '' })
  scimToken: string;

  @Prop({ enum: ['1h', '8h', '30d'], default: '8h' })
  idleTimeout: string;

  @Prop({ default: false })
  twoFactorRequired: boolean;

  @Prop({ default: false })
  autoDeleteEnabled: boolean;

  @Prop({ type: [String], default: [] })
  ipAllowlist: string[];
}

export const EmployerSecuritySettingsSchema = SchemaFactory.createForClass(
  EmployerSecuritySettings,
);

// ownerId already has a unique index via @Prop({ unique: true }).
