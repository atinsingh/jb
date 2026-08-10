import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type EmployerWebhookDocument = EmployerWebhook & Document;

@Schema({ timestamps: true })
export class EmployerWebhook {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ required: true })
  url: string;

  @Prop({ enum: ['active', 'failing', 'disabled'], default: 'active' })
  status: string;

  @Prop({ type: [String], default: [] })
  events: string[];

  @Prop({
    type: [
      {
        event: String,
        code: Number,
        at: Date,
      },
    ],
    default: [],
  })
  deliveries: Array<{
    event: string;
    code: number;
    at: Date;
  }>;
}

export const EmployerWebhookSchema =
  SchemaFactory.createForClass(EmployerWebhook);
// ownerId is already indexed via @Prop({ index: true }).
