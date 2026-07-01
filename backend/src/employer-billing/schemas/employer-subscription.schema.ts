import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EmployerSubscriptionDocument = EmployerSubscription & Document;

@Schema({ timestamps: true })
export class EmployerSubscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ enum: ['starter', 'growth', 'scale', 'enterprise'], default: 'growth' })
  plan: string;

  @Prop({ enum: ['monthly', 'annual'], default: 'annual' })
  billingCycle: string;

  @Prop({ default: 5 })
  jobSlotsLimit: number;

  @Prop({ default: 0 })
  jobSlotsUsed: number;

  @Prop({ default: 6 })
  seatsLimit: number;

  @Prop({ default: 1 })
  seatsUsed: number;

  @Prop({ default: 500 })
  aiActionsLimit: number;

  @Prop({ default: 0 })
  aiActionsUsed: number;

  @Prop({ default: 100 })
  sourcingCreditsLimit: number;

  @Prop({ default: 0 })
  sourcingCreditsUsed: number;

  @Prop({ type: Date })
  renewsAt?: Date;

  @Prop({
    type: [
      {
        date: Date,
        description: String,
        amount: Number,
        status: String,
      },
    ],
    default: [],
  })
  invoices: Array<{
    date: Date;
    description: string;
    amount: number;
    status: string;
  }>;
}

export const EmployerSubscriptionSchema = SchemaFactory.createForClass(EmployerSubscription);

EmployerSubscriptionSchema.index({ ownerId: 1 }, { unique: true });
