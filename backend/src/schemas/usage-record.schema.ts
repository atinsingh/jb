import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

export type UsageRecordDocument = HydratedDocument<UsageRecord>;

@Schema({ timestamps: true, collection: 'usage_records' })
export class UsageRecord {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  featureKey: string;

  @Prop({ required: true, default: 0 })
  count: number;

  @Prop({ required: true })
  periodStart: Date;

  @Prop({ required: true })
  periodEnd: Date;

  @Prop()
  lastUsedAt?: Date;
}

export const UsageRecordSchema = SchemaFactory.createForClass(UsageRecord);

// Indexes
UsageRecordSchema.index({ userId: 1, featureKey: 1, periodStart: 1, periodEnd: 1 }, { unique: true });
UsageRecordSchema.index({ userId: 1, featureKey: 1 });
UsageRecordSchema.index({ periodEnd: 1 });

