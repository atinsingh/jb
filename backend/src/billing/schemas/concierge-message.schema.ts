import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

export type ConciergeMessageDocument = HydratedDocument<ConciergeMessage>;

@Schema({ timestamps: true, collection: 'concierge_messages' })
export class ConciergeMessage {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  candidateId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  employerId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ required: true })
  body: string;
}

export const ConciergeMessageSchema = SchemaFactory.createForClass(ConciergeMessage);
