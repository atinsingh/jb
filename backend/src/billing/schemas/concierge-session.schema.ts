import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

export type ConciergeSessionDocument = HydratedDocument<ConciergeSession>;

@Schema({ timestamps: true, collection: 'concierge_sessions' })
export class ConciergeSession {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  candidateId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  employerId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  startsAt: Date;

  @Prop({ required: true })
  hours: number;
}

export const ConciergeSessionSchema = SchemaFactory.createForClass(ConciergeSession);
