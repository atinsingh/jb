import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type EmployerTalentCandidateDocument = EmployerTalentCandidate &
  Document;

@Schema({ timestamps: true })
export class EmployerTalentCandidate {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  headline?: string;

  @Prop({ default: '' })
  initials?: string;

  @Prop({ type: [String], default: [] })
  skills?: string[];

  @Prop({
    enum: ['saved', 'silver', 'future'],
    default: 'saved',
    index: true,
  })
  segment?: string;

  @Prop({ default: '' })
  tag?: string;

  @Prop({ default: '' })
  source?: string;

  @Prop({ default: Date.now })
  addedAt?: Date;
}

export const EmployerTalentCandidateSchema = SchemaFactory.createForClass(
  EmployerTalentCandidate,
);

EmployerTalentCandidateSchema.index({ ownerId: 1, segment: 1 });
