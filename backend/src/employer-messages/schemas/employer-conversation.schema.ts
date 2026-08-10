import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type EmployerConversationDocument = EmployerConversation & Document;

@Schema({ timestamps: true })
export class EmployerConversation {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ required: true })
  candidateName: string;

  @Prop({ default: '' })
  candidateId: string;

  @Prop({ default: '' })
  role: string;

  @Prop({ default: '' })
  lastMessage: string;

  @Prop({ type: Date, default: null })
  lastMessageAt: Date | null;

  @Prop({ default: 0 })
  unread: number;
}

export const EmployerConversationSchema =
  SchemaFactory.createForClass(EmployerConversation);

EmployerConversationSchema.index({ ownerId: 1, lastMessageAt: -1 });
