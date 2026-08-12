import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type EmployerAutopilotConfigDocument = EmployerAutopilotConfig & Document;

export interface AutopilotRule {
  type: 'auto_propose_reject' | 'auto_propose_advance';
  scoreThreshold: number;
  enabled: boolean;
}

const DEFAULT_RULES: AutopilotRule[] = [
  { type: 'auto_propose_reject', scoreThreshold: 40, enabled: true },
  { type: 'auto_propose_advance', scoreThreshold: 80, enabled: true },
];

@Schema({ timestamps: true })
export class EmployerAutopilotConfig {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  enabled: boolean;

  @Prop({
    type: [
      {
        type: { type: String, enum: ['auto_propose_reject', 'auto_propose_advance'], required: true },
        scoreThreshold: { type: Number, required: true },
        enabled: { type: Boolean, default: true },
      },
    ],
    default: DEFAULT_RULES,
  })
  rules: AutopilotRule[];
}

export const EmployerAutopilotConfigSchema = SchemaFactory.createForClass(EmployerAutopilotConfig);
export { DEFAULT_RULES };
