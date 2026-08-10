import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type EmployerApiKeyDocument = EmployerApiKey & Document;

@Schema({ timestamps: true })
export class EmployerApiKey {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ enum: ['live', 'test'], default: 'live' })
  env: string;

  @Prop({ required: true })
  keyPrefix: string;

  @Prop({ required: true })
  secret: string;

  @Prop({ type: [String], default: [] })
  scopes: string[];

  @Prop({ type: Date })
  lastUsedAt?: Date;
}

export const EmployerApiKeySchema = SchemaFactory.createForClass(EmployerApiKey);
// ownerId is already indexed via @Prop({ index: true }).
