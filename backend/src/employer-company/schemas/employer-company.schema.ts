import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type EmployerCompanyDocument = EmployerCompany & Document;

@Schema({ timestamps: true })
export class EmployerCompany {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true })
  ownerId: Types.ObjectId;

  @Prop({ default: '' })
  name: string;

  @Prop({ default: '' })
  website: string;

  @Prop({ default: '' })
  industry: string;

  @Prop({ default: '' })
  size: string;

  @Prop({ default: '' })
  hq: string;

  @Prop({ default: '' })
  tagline: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  founded: string;

  @Prop({ default: '' })
  logoUrl: string;

  @Prop({ default: '' })
  coverUrl: string;

  @Prop({ default: '' })
  linkedin: string;

  @Prop({ default: '' })
  twitter: string;
}

export const EmployerCompanySchema =
  SchemaFactory.createForClass(EmployerCompany);
