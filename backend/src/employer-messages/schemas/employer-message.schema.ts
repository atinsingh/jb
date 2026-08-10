import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type EmployerMessageDocument = EmployerMessage & Document;

@Schema({ timestamps: true })
export class EmployerMessage {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  conversationId: Types.ObjectId;

  @Prop({ enum: ['employer', 'candidate'], default: 'employer' })
  sender: string;

  @Prop({ required: true })
  body: string;

  @Prop({ default: false })
  read: boolean;
}

export const EmployerMessageSchema =
  SchemaFactory.createForClass(EmployerMessage);

EmployerMessageSchema.index({ conversationId: 1, createdAt: 1 });
