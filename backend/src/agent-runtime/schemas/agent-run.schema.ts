import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type AgentRunDocument = AgentRun & Document;

/** Lifecycle status of an agent run. */
export type AgentRunStatus =
  | 'running'
  | 'awaiting'
  | 'completed'
  | 'failed'
  | 'stopped';

/** One recorded step in a run's trace. */
export type AgentStepType =
  | 'llm'
  | 'tool_call'
  | 'tool_result'
  | 'final'
  | 'error';

/**
 * A single entry in the run trace. Stored inline (not a sub-document class) so
 * the loop can push heterogeneous shapes cheaply. `at` is set at push time.
 */
export interface AgentRunStep {
  type: AgentStepType;
  tool?: string;
  args?: any;
  output?: any;
  text?: string;
  tokens?: number;
  at: Date;
}

/**
 * Persisted record of a single AI agent run through the generic runtime
 * (planner/executor loop). Captures the goal/input, the full step trace, budget
 * + consumption, terminal status and result/error. NOTE: this is the generic
 * `agent-runtime` domain — distinct from the human-concierge `agents/` domain.
 */
@Schema({ timestamps: true })
export class AgentRun {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  agentType: string;

  @Prop({
    type: String,
    enum: ['running', 'awaiting', 'completed', 'failed', 'stopped'],
    default: 'running',
  })
  status: AgentRunStatus;

  @Prop({ type: String, required: false })
  goal?: string;

  @Prop({ type: Object, required: false })
  input?: any;

  @Prop({
    type: [
      {
        type: {
          type: String,
          enum: ['llm', 'tool_call', 'tool_result', 'final', 'error'],
          required: true,
        },
        tool: { type: String, required: false },
        args: { type: Object, required: false },
        output: { type: Object, required: false },
        text: { type: String, required: false },
        tokens: { type: Number, required: false },
        at: { type: Date, required: true },
      },
    ],
    default: [],
  })
  steps: AgentRunStep[];

  @Prop({
    type: { maxSteps: Number, maxTokens: Number },
    required: true,
  })
  budget: { maxSteps: number; maxTokens: number };

  @Prop({ type: Number, default: 0 })
  stepsUsed: number;

  @Prop({ type: Number, default: 0 })
  tokensUsed: number;

  @Prop({ type: Object, required: false })
  result?: any;

  @Prop({ type: String, required: false })
  error?: string;

  @Prop({ type: String, required: false })
  feature?: string;
}

export const AgentRunSchema = SchemaFactory.createForClass(AgentRun);

// Recent-runs-per-user listing.
AgentRunSchema.index({ userId: 1, createdAt: -1 });
