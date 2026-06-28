import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CoverLetterDocument = CoverLetter & Document;

@Schema({ timestamps: true })
export class CoverLetter {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  jobTitle: string;

  @Prop({ required: true })
  companyName: string;

  @Prop({ required: true })
  jobDescription: string;

  @Prop()
  additionalInfo?: string;

  @Prop({ required: true, enum: ['professional', 'modern', 'concise', 'enthusiastic', 'storytelling'] })
  template: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  pdfUrl?: string;

  @Prop()
  pdfPath?: string;

  @Prop({ default: false })
  isReviewed?: boolean;

  @Prop()
  reviewedBy?: Types.ObjectId;

  @Prop()
  reviewedAt?: Date;

  // Timestamps (automatically added by Mongoose with timestamps: true)
  createdAt?: Date;
  updatedAt?: Date;
}

export const CoverLetterSchema = SchemaFactory.createForClass(CoverLetter);

