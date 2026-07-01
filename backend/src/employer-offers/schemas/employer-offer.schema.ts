import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EmployerOfferDocument = EmployerOffer & Document;

@Schema({ timestamps: true })
export class EmployerOffer {
  @Prop({ type: Types.ObjectId, ref: 'EmployerJob', required: false })
  jobId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'EmployerApplicant', required: false })
  applicantId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
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

EmployerOfferSchema.index({ ownerId: 1 });
EmployerOfferSchema.index({ status: 1 });
