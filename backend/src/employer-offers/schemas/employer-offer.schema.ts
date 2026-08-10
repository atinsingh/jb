import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type EmployerOfferDocument = EmployerOffer & Document;

@Schema({ timestamps: true })
export class EmployerOffer {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'EmployerJob', required: false })
  jobId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'EmployerApplicant', required: false })
  applicantId?: Types.ObjectId;

  // Real candidate (User) the offer is for. Resolved from the linked
  // EmployerApplicant on create; drives the candidate-side notification.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false, index: true })
  candidateId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ default: '' })
  candidateName?: string;

  @Prop({ type: Number })
  base?: number;

  @Prop({ type: Number })
  equityPerYear?: number;

  @Prop({ type: Number })
  signOnBonus?: number;

  @Prop({ type: Number })
  targetBonus?: number;

  @Prop({ type: Date })
  startDate?: Date;

  @Prop({
    enum: ['draft', 'sent', 'negotiating', 'accepted', 'declined'],
    default: 'draft',
    index: true,
  })
  status?: string;

  @Prop({ type: Date })
  sentAt?: Date;

  @Prop({ type: Date })
  expiresAt?: Date;
}

export const EmployerOfferSchema = SchemaFactory.createForClass(EmployerOffer);

// ownerId and status are already single-field indexed via @Prop({ index: true }).
EmployerOfferSchema.index({ ownerId: 1, status: 1 });
