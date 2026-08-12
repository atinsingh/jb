# Employer AI Features (Copilot, Sourcing, Autopilot) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the three already-real, already-wired employer AI pages (Copilot, Sourcing, Autopilot) the specific behavior they're missing: Copilot gets real multi-turn tool use instead of single-turn chat with cosmetic actions; Sourcing searches the talent pool in addition to applicant history; Autopilot persists its on/off state and can actually execute what it proposes, with a human always approving first.

**Architecture:** One shared `AiProposedAction` model + `EmployerAiActionsService` execution path underlies both Copilot's tool calls and Autopilot's rule matches — neither feature re-implements "apply this action to a real applicant record." Copilot's tool-use loop reuses the existing `agent-runtime` module (already powering the candidate-side Job-Search Copilot) rather than building a second agent loop.

**Tech Stack:** NestJS + Mongoose (backend), Next.js pages router (frontend), existing `LLMRoutingService`/`LLMQuotaService` for LLM calls, existing `agent-runtime` module for tool-use.

## Global Constraints

- Every new DTO field MUST carry a `class-validator` decorator — `main.ts` runs `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`, which determines a DTO's shape from decorator metadata, not TypeScript types. An undecorated field is rejected as unknown, not merely unvalidated. (Confirmed the hard way earlier on this branch — see `backend/src/employer-jobs/dto/generate-job-description.dto.ts` for the pattern to copy.)
- No action from Copilot or Autopilot ever mutates an applicant/interview/conversation directly. Every action tool/rule creates an `AiProposedAction`; only `EmployerAiActionsService.decide()` with `decision: 'approve'` executes anything.
- All new controller routes live under existing `@Controller` prefixes where possible (`employer/ai`) and are guarded the same way as their siblings: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')`.
- Every new service method that calls an LLM goes through the existing `enforceQuota`/`recordUsageAndIncrement` pair against the already-existing `LLMFeature` values (`SCREEN_APPLICANTS`, `RECRUITER_COPILOT`, `SOURCE_CANDIDATES`) — no new `LLMFeature` enum value, no new quota key.
- Deviations from the spec found during ground-truth verification (fold in, don't re-litigate): Sourcing already queries all of an employer's jobs (no `jobId` filter existed) — only the talent-pool merge is new. `EmployerTalentCandidate` has no `candidateId`/`email` field — Task 12 adds one. The autopilot-evaluation hook lives in `applications.service.ts` (the caller), not inside `EmployerPipelineService.upsertApplicant` itself, to avoid a module import cycle (`AiRecruiterModule` already imports `EmployerPipelineModule`).

---

## Phase 1 — Shared foundation

### Task 1: `AiProposedAction` schema

**Files:**
- Create: `backend/src/ai-recruiter/schemas/ai-proposed-action.schema.ts`
- Test: `backend/src/ai-recruiter/schemas/ai-proposed-action.schema.spec.ts`

**Interfaces:**
- Produces: `AiProposedAction` class, `AiProposedActionDocument` type, `AiProposedActionSchema`, and these literal union types every later task imports:
  ```ts
  export type ProposedActionSource = 'copilot' | 'autopilot';
  export type ProposedActionType = 'advance_stage' | 'reject' | 'schedule_interview' | 'send_message';
  export type ProposedActionStatus = 'pending' | 'approved' | 'rejected' | 'failed';
  ```

- [ ] **Step 1: Write the schema**

```ts
// backend/src/ai-recruiter/schemas/ai-proposed-action.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type AiProposedActionDocument = AiProposedAction & Document;
export type ProposedActionSource = 'copilot' | 'autopilot';
export type ProposedActionType =
  | 'advance_stage'
  | 'reject'
  | 'schedule_interview'
  | 'send_message';
export type ProposedActionStatus = 'pending' | 'approved' | 'rejected' | 'failed';

/**
 * A single-decision AI-proposed action awaiting employer approval.
 *
 * Deliberately NOT the same model as EmployerApproval, which represents
 * multi-step human approval CHAINS (Hiring Manager -> Finance -> VP) for
 * things like offer or budget requests. An AI proposal to move one applicant
 * to Interview needs exactly one yes/no from the employer, not a chain -
 * reusing EmployerApproval's generic `fields`/`chain` shape would mean
 * encoding structured, executable data into string pairs and parsing it back
 * out to execute, for no benefit.
 */
@Schema({ timestamps: true })
export class AiProposedAction {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ type: String, enum: ['copilot', 'autopilot'], required: true })
  source: ProposedActionSource;

  @Prop({
    type: String,
    enum: ['advance_stage', 'reject', 'schedule_interview', 'send_message'],
    required: true,
  })
  actionType: ProposedActionType;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'EmployerApplicant', required: true, index: true })
  applicantId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'EmployerJob', required: false })
  jobId?: Types.ObjectId;

  // Shape depends on actionType — see the plan's Task 2 for exactly which
  // fields each actionType reads:
  //   advance_stage: { targetStage: string }
  //   reject: {}
  //   schedule_interview: { type?: string, proposedAt?: string, durationMins?: number }
  //   send_message: { conversationId?: string, draftText: string }
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  payload: Record<string, any>;

  @Prop({ type: String, required: true })
  rationale: string;

  @Prop({ type: String, enum: ['pending', 'approved', 'rejected', 'failed'], default: 'pending', index: true })
  status: ProposedActionStatus;

  @Prop({ type: String, required: false })
  failureReason?: string;

  @Prop({ type: Date, required: false })
  decidedAt?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  decidedBy?: Types.ObjectId;
}

export const AiProposedActionSchema = SchemaFactory.createForClass(AiProposedAction);

AiProposedActionSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
// Idempotency lookup used by AutopilotRulesService (Task 4).
AiProposedActionSchema.index({ applicantId: 1, actionType: 1, source: 1 });
```

- [ ] **Step 2: Write the failing test**

```ts
// backend/src/ai-recruiter/schemas/ai-proposed-action.schema.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Types } from 'mongoose';
import {
  AiProposedAction,
  AiProposedActionSchema,
  AiProposedActionDocument,
} from './ai-proposed-action.schema';

describe('AiProposedAction schema', () => {
  let mongod: MongoMemoryServer;
  let module: TestingModule;
  let model: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri()),
        MongooseModule.forFeature([
          { name: AiProposedAction.name, schema: AiProposedActionSchema },
        ]),
      ],
    }).compile();
    model = module.get(getModelToken(AiProposedAction.name));
  });

  afterAll(async () => {
    await module.close();
    await mongod.stop();
  });

  it('defaults a new proposal to pending status', async () => {
    const doc: AiProposedActionDocument = await model.create({
      ownerId: new Types.ObjectId(),
      source: 'autopilot',
      actionType: 'reject',
      applicantId: new Types.ObjectId(),
      rationale: 'Score below threshold',
    });

    expect(doc.status).toBe('pending');
    expect(doc.payload).toEqual({});
  });

  it('rejects an actionType outside the enum', async () => {
    await expect(
      model.create({
        ownerId: new Types.ObjectId(),
        source: 'copilot',
        actionType: 'delete_everything',
        applicantId: new Types.ObjectId(),
        rationale: 'x',
      }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && npx jest src/ai-recruiter/schemas/ai-proposed-action.schema.spec.ts`
Expected: FAIL — `Cannot find module './ai-proposed-action.schema'` (file doesn't exist yet if you wrote the test first; if you wrote Step 1 already, skip to confirming it passes).

- [ ] **Step 4: Confirm `mongodb-memory-server` is available**

```bash
cd backend && grep -q "mongodb-memory-server" package.json && echo "present" || npm install --save-dev mongodb-memory-server
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && npx jest src/ai-recruiter/schemas/ai-proposed-action.schema.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/src/ai-recruiter/schemas/ai-proposed-action.schema.ts backend/src/ai-recruiter/schemas/ai-proposed-action.schema.spec.ts backend/package.json backend/package-lock.json
git commit -m "feat(ai-recruiter): add AiProposedAction schema"
```

---

### Task 2: `EmployerAiActionsService` — decide and execute

**Files:**
- Create: `backend/src/ai-recruiter/employer-ai-actions.service.ts`
- Test: `backend/src/ai-recruiter/employer-ai-actions.service.spec.ts`
- Create: `backend/src/ai-recruiter/dto/decide-proposed-action.dto.ts`

**Interfaces:**
- Consumes: `AiProposedAction`/`AiProposedActionDocument` (Task 1); `EmployerPipelineService.updateStage(ownerId: string, id: string, stage: string): Promise<EmployerApplicantDocument>` (existing); `EmployerInterviewsService.create(ownerId: string, dto: ScheduleInterviewDto): Promise<EmployerInterviewDocument>` (existing); `EmployerMessagesService.createConversation(ownerId: string, dto: CreateConversationDto): Promise<EmployerConversationDocument>` and `.sendMessage(ownerId: string, conversationId: string, dto: SendMessageDto): Promise<EmployerMessageDocument>` (existing).
- Produces:
  ```ts
  create(input: {
    ownerId: string; source: 'copilot' | 'autopilot'; actionType: ProposedActionType;
    applicantId: string; jobId?: string; payload: Record<string, any>; rationale: string;
  }): Promise<AiProposedActionDocument>

  list(ownerId: string, status?: ProposedActionStatus): Promise<AiProposedActionDocument[]>

  decide(ownerId: string, id: string, decision: 'approve' | 'reject', decidedBy: string): Promise<AiProposedActionDocument>
  ```
  `decide()` is what Tasks 6 and later call — a proposal's `status` ends as `'approved'`, `'rejected'`, or `'failed'` (never left `'pending'` after this resolves, and never silently `'approved'` if execution actually failed).

- [ ] **Step 1: Write the DTO**

```ts
// backend/src/ai-recruiter/dto/decide-proposed-action.dto.ts
import { IsIn } from 'class-validator';

export class DecideProposedActionDto {
  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';
}
```

- [ ] **Step 2: Write the failing tests**

```ts
// backend/src/ai-recruiter/employer-ai-actions.service.spec.ts
import { Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { EmployerAiActionsService } from './employer-ai-actions.service';

describe('EmployerAiActionsService', () => {
  const ownerId = new Types.ObjectId().toString();
  const applicantId = new Types.ObjectId().toString();
  const decidedBy = new Types.ObjectId().toString();

  const buildProposal = (overrides: Partial<any> = {}) => ({
    _id: new Types.ObjectId(),
    ownerId: new Types.ObjectId(ownerId),
    applicantId: new Types.ObjectId(applicantId),
    source: 'autopilot',
    actionType: 'reject',
    payload: {},
    status: 'pending',
    save: jest.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    }),
    ...overrides,
  });

  const buildService = (proposal: any) => {
    const proposedActionModel: any = {
      create: jest.fn().mockResolvedValue(proposal),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([proposal]) }),
      }),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(proposal) }),
    };
    const pipelineService: any = { updateStage: jest.fn().mockResolvedValue({}) };
    const interviewsService: any = { create: jest.fn().mockResolvedValue({}) };
    const messagesService: any = {
      createConversation: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      sendMessage: jest.fn().mockResolvedValue({}),
    };

    const service = new EmployerAiActionsService(
      proposedActionModel,
      pipelineService,
      interviewsService,
      messagesService,
    );
    return { service, proposedActionModel, pipelineService, interviewsService, messagesService };
  };

  it('creates a pending proposal with the given fields', async () => {
    const proposal = buildProposal();
    const { service, proposedActionModel } = buildService(proposal);

    await service.create({
      ownerId,
      source: 'copilot',
      actionType: 'advance_stage',
      applicantId,
      payload: { targetStage: 'interview' },
      rationale: 'Strong technical fit',
    });

    expect(proposedActionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'copilot',
        actionType: 'advance_stage',
        payload: { targetStage: 'interview' },
        rationale: 'Strong technical fit',
      }),
    );
  });

  it('throws NotFoundException deciding a proposal that does not belong to this owner', async () => {
    const proposedActionModel: any = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    };
    const service = new EmployerAiActionsService(
      proposedActionModel, {} as any, {} as any, {} as any,
    );

    await expect(
      service.decide(ownerId, new Types.ObjectId().toString(), 'approve', decidedBy),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejecting a proposal sets status=rejected and never executes anything', async () => {
    const proposal = buildProposal();
    const { service, pipelineService } = buildService(proposal);

    const result = await service.decide(ownerId, proposal._id.toString(), 'reject', decidedBy);

    expect(result.status).toBe('rejected');
    expect(pipelineService.updateStage).not.toHaveBeenCalled();
  });

  it('approving advance_stage calls EmployerPipelineService.updateStage with the payload target', async () => {
    const proposal = buildProposal({
      actionType: 'advance_stage',
      payload: { targetStage: 'interview' },
    });
    const { service, pipelineService } = buildService(proposal);

    const result = await service.decide(ownerId, proposal._id.toString(), 'approve', decidedBy);

    expect(pipelineService.updateStage).toHaveBeenCalledWith(ownerId, applicantId, 'interview');
    expect(result.status).toBe('approved');
  });

  it('approving reject calls EmployerPipelineService.updateStage with rejected', async () => {
    const proposal = buildProposal({ actionType: 'reject', payload: {} });
    const { service, pipelineService } = buildService(proposal);

    await service.decide(ownerId, proposal._id.toString(), 'approve', decidedBy);

    expect(pipelineService.updateStage).toHaveBeenCalledWith(ownerId, applicantId, 'rejected');
  });

  it('approving schedule_interview calls EmployerInterviewsService.create with applicantId + payload', async () => {
    const proposal = buildProposal({
      actionType: 'schedule_interview',
      payload: { type: 'video', proposedAt: '2026-09-01T15:00:00.000Z', durationMins: 30 },
    });
    const { service, interviewsService } = buildService(proposal);

    await service.decide(ownerId, proposal._id.toString(), 'approve', decidedBy);

    expect(interviewsService.create).toHaveBeenCalledWith(ownerId, {
      applicantId,
      type: 'video',
      scheduledAt: '2026-09-01T15:00:00.000Z',
      durationMins: 30,
    });
  });

  it('approving send_message with no conversationId creates one first, then sends', async () => {
    const proposal = buildProposal({
      actionType: 'send_message',
      payload: { draftText: 'Thanks for applying!' },
    });
    const { service, messagesService } = buildService(proposal);

    await service.decide(ownerId, proposal._id.toString(), 'approve', decidedBy);

    expect(messagesService.createConversation).toHaveBeenCalled();
    expect(messagesService.sendMessage).toHaveBeenCalled();
  });

  it('a failure during execution sets status=failed with a reason, never silently approved', async () => {
    const proposal = buildProposal({ actionType: 'advance_stage', payload: { targetStage: 'interview' } });
    const { service, pipelineService } = buildService(proposal);
    pipelineService.updateStage.mockRejectedValue(new Error('applicant not found'));

    const result = await service.decide(ownerId, proposal._id.toString(), 'approve', decidedBy);

    expect(result.status).toBe('failed');
    expect(result.failureReason).toContain('applicant not found');
  });

  it('lists proposals for an owner, optionally filtered by status', async () => {
    const proposal = buildProposal();
    const { service, proposedActionModel } = buildService(proposal);

    await service.list(ownerId, 'pending');

    expect(proposedActionModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' }),
    );
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && npx jest src/ai-recruiter/employer-ai-actions.service.spec.ts`
Expected: FAIL — `Cannot find module './employer-ai-actions.service'`

- [ ] **Step 4: Write the implementation**

```ts
// backend/src/ai-recruiter/employer-ai-actions.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AiProposedAction,
  AiProposedActionDocument,
  ProposedActionSource,
  ProposedActionStatus,
  ProposedActionType,
} from './schemas/ai-proposed-action.schema';
import { EmployerPipelineService } from '../employer-pipeline/employer-pipeline.service';
import { EmployerInterviewsService } from '../employer-interviews/employer-interviews.service';
import { EmployerMessagesService } from '../employer-messages/employer-messages.service';

export interface CreateProposedActionInput {
  ownerId: string;
  source: ProposedActionSource;
  actionType: ProposedActionType;
  applicantId: string;
  jobId?: string;
  payload: Record<string, any>;
  rationale: string;
}

@Injectable()
export class EmployerAiActionsService {
  private readonly logger = new Logger(EmployerAiActionsService.name);

  constructor(
    @InjectModel(AiProposedAction.name)
    private readonly proposedActionModel: Model<AiProposedActionDocument>,
    private readonly pipelineService: EmployerPipelineService,
    private readonly interviewsService: EmployerInterviewsService,
    private readonly messagesService: EmployerMessagesService,
  ) {}

  async create(input: CreateProposedActionInput): Promise<AiProposedActionDocument> {
    return this.proposedActionModel.create({
      ownerId: new Types.ObjectId(input.ownerId),
      source: input.source,
      actionType: input.actionType,
      applicantId: new Types.ObjectId(input.applicantId),
      jobId: input.jobId ? new Types.ObjectId(input.jobId) : undefined,
      payload: input.payload,
      rationale: input.rationale,
    });
  }

  async list(
    ownerId: string,
    status?: ProposedActionStatus,
  ): Promise<AiProposedActionDocument[]> {
    const query: any = { ownerId: new Types.ObjectId(ownerId) };
    if (status) query.status = status;
    return this.proposedActionModel.find(query).sort({ createdAt: -1 }).exec();
  }

  /**
   * The idempotency check AutopilotRulesService (Task 4) uses before
   * creating a new proposal: any row at all — pending or already decided —
   * for this (applicant, actionType, source) blocks a duplicate.
   */
  async existsFor(
    applicantId: string,
    actionType: ProposedActionType,
    source: ProposedActionSource,
  ): Promise<boolean> {
    const found = await this.proposedActionModel
      .findOne({
        applicantId: new Types.ObjectId(applicantId),
        actionType,
        source,
      })
      .exec();
    return !!found;
  }

  async decide(
    ownerId: string,
    id: string,
    decision: 'approve' | 'reject',
    decidedBy: string,
  ): Promise<AiProposedActionDocument> {
    const proposal = await this.proposedActionModel
      .findOne({ _id: id, ownerId: new Types.ObjectId(ownerId) })
      .exec();
    if (!proposal) {
      throw new NotFoundException('Proposed action not found');
    }

    proposal.decidedAt = new Date();
    proposal.decidedBy = new Types.ObjectId(decidedBy);

    if (decision === 'reject') {
      proposal.status = 'rejected';
      return proposal.save();
    }

    try {
      await this.execute(ownerId, proposal);
      proposal.status = 'approved';
    } catch (error: any) {
      this.logger.warn(
        `Approved proposal ${proposal._id} failed to execute: ${error?.message || error}`,
      );
      proposal.status = 'failed';
      proposal.failureReason = error?.message || 'Unknown error';
    }

    return proposal.save();
  }

  private async execute(
    ownerId: string,
    proposal: AiProposedActionDocument,
  ): Promise<void> {
    const applicantId = proposal.applicantId.toString();

    switch (proposal.actionType) {
      case 'advance_stage': {
        const targetStage = proposal.payload?.targetStage;
        if (!targetStage) throw new Error('Missing targetStage in proposal payload');
        await this.pipelineService.updateStage(ownerId, applicantId, targetStage);
        return;
      }
      case 'reject': {
        await this.pipelineService.updateStage(ownerId, applicantId, 'rejected');
        return;
      }
      case 'schedule_interview': {
        await this.interviewsService.create(ownerId, {
          applicantId,
          type: proposal.payload?.type,
          scheduledAt: proposal.payload?.proposedAt,
          durationMins: proposal.payload?.durationMins,
        } as any);
        return;
      }
      case 'send_message': {
        let conversationId = proposal.payload?.conversationId;
        if (!conversationId) {
          const conversation = await this.messagesService.createConversation(ownerId, {
            candidateName: 'Candidate',
          } as any);
          conversationId = (conversation as any)._id.toString();
        }
        await this.messagesService.sendMessage(ownerId, conversationId, {
          body: proposal.payload?.draftText || '',
        } as any);
        return;
      }
      default:
        throw new Error(`Unknown actionType: ${proposal.actionType}`);
    }
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx jest src/ai-recruiter/employer-ai-actions.service.spec.ts`
Expected: PASS (9 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/src/ai-recruiter/employer-ai-actions.service.ts backend/src/ai-recruiter/employer-ai-actions.service.spec.ts backend/src/ai-recruiter/dto/decide-proposed-action.dto.ts
git commit -m "feat(ai-recruiter): add EmployerAiActionsService decide/execute path"
```

---

## Phase 2 — Autopilot

### Task 3: `EmployerAutopilotConfig` schema + persisted toggle

**Files:**
- Create: `backend/src/ai-recruiter/schemas/employer-autopilot-config.schema.ts`
- Modify: `backend/src/ai-recruiter/ai-recruiter.service.ts` (`getAutopilot`, `toggleAutopilot`)
- Modify: `backend/src/ai-recruiter/ai-recruiter.controller.ts` (`toggleAutopilot` — pass `employerId` through)
- Test: `backend/src/ai-recruiter/ai-recruiter.service.spec.ts` (new file — none exists today)

**Interfaces:**
- Produces:
  ```ts
  export interface AutopilotRule {
    type: 'auto_propose_reject' | 'auto_propose_advance';
    scoreThreshold: number;
    enabled: boolean;
  }
  // AiRecruiterService:
  getOrCreateAutopilotConfig(ownerId: string): Promise<EmployerAutopilotConfigDocument>
  toggleAutopilot(ownerId: string, enabled: boolean): Promise<{ enabled: boolean; status: string; message: string }>
  ```
  `getAutopilot(ownerId)`'s existing return shape is unchanged except `enabled` now reflects the persisted config instead of `queue.length > 0`.

- [ ] **Step 1: Write the schema**

```ts
// backend/src/ai-recruiter/schemas/employer-autopilot-config.schema.ts
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
```

- [ ] **Step 2: Write the failing test for the service change**

```ts
// backend/src/ai-recruiter/ai-recruiter.service.spec.ts
import { Types } from 'mongoose';
import { AiRecruiterService } from './ai-recruiter.service';

describe('AiRecruiterService.toggleAutopilot / getOrCreateAutopilotConfig', () => {
  const ownerId = new Types.ObjectId().toString();

  const buildService = (existingConfig: any = null) => {
    const savedDoc = { ownerId: new Types.ObjectId(ownerId), enabled: false, rules: [] };
    const autopilotConfigModel: any = {
      findOneAndUpdate: jest.fn().mockResolvedValue(existingConfig || savedDoc),
    };
    const applicantModel: any = { find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }) };
    const proposedActionModel: any = { find: jest.fn(), findOne: jest.fn() }; // unused by these tests — added in Step 5b below
    const service = new AiRecruiterService(
      applicantModel,
      {} as any, // routingService — unused by this test
      {} as any, // quotaService — unused by this test
      autopilotConfigModel,
      proposedActionModel,
    );
    return { service, autopilotConfigModel };
  };

  it('getOrCreateAutopilotConfig upserts a default-disabled config on first read', async () => {
    const { service, autopilotConfigModel } = buildService();

    await service.getOrCreateAutopilotConfig(ownerId);

    expect(autopilotConfigModel.findOneAndUpdate).toHaveBeenCalledWith(
      { ownerId: new Types.ObjectId(ownerId) },
      expect.objectContaining({ $setOnInsert: expect.objectContaining({ enabled: false }) }),
      expect.objectContaining({ upsert: true, new: true }),
    );
  });

  it('toggleAutopilot persists the enabled flag for this owner', async () => {
    const { service, autopilotConfigModel } = buildService({
      ownerId: new Types.ObjectId(ownerId), enabled: true, rules: [],
    });

    const result = await service.toggleAutopilot(ownerId, true);

    expect(autopilotConfigModel.findOneAndUpdate).toHaveBeenCalledWith(
      { ownerId: new Types.ObjectId(ownerId) },
      expect.objectContaining({ $set: { enabled: true } }),
      expect.objectContaining({ upsert: true, new: true }),
    );
    expect(result.enabled).toBe(true);
    expect(result.status).toBe('active');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && npx jest src/ai-recruiter/ai-recruiter.service.spec.ts`
Expected: FAIL — `getOrCreateAutopilotConfig is not a function` (constructor also doesn't accept a 4th arg yet)

- [ ] **Step 4: Modify `AiRecruiterService`**

In `backend/src/ai-recruiter/ai-recruiter.service.ts`:

```ts
// Add to imports:
import {
  EmployerAutopilotConfig,
  EmployerAutopilotConfigDocument,
} from './schemas/employer-autopilot-config.schema';

// Change constructor to:
constructor(
  @InjectModel(EmployerApplicant.name)
  private readonly applicantModel: Model<EmployerApplicantDocument>,
  private readonly routingService: LLMRoutingService,
  private readonly quotaService: LLMQuotaService,
  @InjectModel(EmployerAutopilotConfig.name)
  private readonly autopilotConfigModel: Model<EmployerAutopilotConfigDocument>,
) {}

// Add these two methods:
async getOrCreateAutopilotConfig(ownerId: string): Promise<EmployerAutopilotConfigDocument> {
  return this.autopilotConfigModel.findOneAndUpdate(
    { ownerId: new Types.ObjectId(ownerId) },
    { $setOnInsert: { enabled: false } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async toggleAutopilot(
  ownerId: string,
  enabled: boolean,
): Promise<{ enabled: boolean; status: string; message: string }> {
  await this.autopilotConfigModel.findOneAndUpdate(
    { ownerId: new Types.ObjectId(ownerId) },
    { $set: { enabled } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return {
    enabled,
    status: enabled ? 'active' : 'paused',
    message: enabled
      ? 'Autopilot enabled. Proposed actions will be generated for new applicants.'
      : 'Autopilot paused. No automated actions will be proposed.',
  };
}
```

Replace the OLD `toggleAutopilot(enabled: boolean)` method (lines 243-251 in the current file) entirely — do not leave both.

In `getAutopilot(ownerId: string)`, replace the line `enabled: queue.length > 0,` with:
```ts
const config = await this.getOrCreateAutopilotConfig(ownerId);
// ... (existing queue/activity/stats computation stays as-is) ...
return {
  enabled: config.enabled,
  status: config.enabled ? 'active' : 'idle',
  stats: { reqsCovered, screenedToday, queued, actionsUsed, actionsLimit },
  rules,
  queue,
  activity,
};
```

This task deliberately does NOT yet change `queue`/`activity` construction — those are addressed with real `AiProposedAction` data in Task 4 (`queue` needs each item's live `proposalId`, which only exists once `EmployerAiActionsService` is registered in this module) and in this task's Step 6 below (`activity`, which only needs the schema from Task 1, already available). Splitting it this way avoids this task depending on a service (`EmployerAiActionsService`) it doesn't otherwise need yet.

- [ ] **Step 5b: Replace `activity`'s construction with real decided-proposal history**

The spec (§3) is explicit: the activity log is a query over decided `AiProposedAction` rows, not a second write path. Replace the existing `activity` construction (built from `applicants.slice(0, 8)`) with:

```ts
// In getAutopilot(ownerId), replace the `activity` variable's construction:
const decidedProposals = await this.proposedActionModel
  .find({ ownerId: new Types.ObjectId(ownerId), status: { $in: ['approved', 'rejected', 'failed'] } })
  .sort({ decidedAt: -1 })
  .limit(8)
  .lean();

const activity = decidedProposals.map((p: any) => ({
  event: this.activityEventLabel(p),
  at: p.decidedAt,
}));
```

Add the small label helper and inject the model:
```ts
// Add to the constructor (5th param — this task's schema dependency):
@InjectModel(AiProposedAction.name)
private readonly proposedActionModel: Model<AiProposedActionDocument>,

// Add as a private method:
private activityEventLabel(p: any): string {
  const verb = p.actionType === 'reject' ? 'Rejected'
    : p.actionType === 'advance_stage' ? 'Advanced'
    : p.actionType === 'schedule_interview' ? 'Interview scheduled for'
    : 'Message sent to';
  const outcome = p.status === 'failed' ? ' (failed — see reason)' : p.status === 'rejected' ? ' (dismissed)' : '';
  return `${verb} applicant${outcome}`;
}
```

(This duplicates the `AiProposedAction`/`AiProposedActionDocument` import already needed elsewhere in this file — add the import once at the top if not already present from an earlier step.)

- [ ] **Step 5: Modify the controller**

In `backend/src/ai-recruiter/ai-recruiter.controller.ts`, change:
```ts
@Post('autopilot/toggle')
async toggleAutopilot(@Body() dto: ToggleAutopilotDto, @Request() req) {
  return this.aiRecruiterService.toggleAutopilot(dto.enabled);
}
```
to:
```ts
@Post('autopilot/toggle')
async toggleAutopilot(@Body() dto: ToggleAutopilotDto, @Request() req) {
  const employerId = req.user._id.toString();
  return this.aiRecruiterService.toggleAutopilot(employerId, dto.enabled);
}
```

- [ ] **Step 6: Register the new schema in `AiRecruiterModule`**

```ts
// backend/src/ai-recruiter/ai-recruiter.module.ts
import { MongooseModule } from '@nestjs/mongoose';
import {
  EmployerAutopilotConfig,
  EmployerAutopilotConfigSchema,
} from './schemas/employer-autopilot-config.schema';
import {
  AiProposedAction,
  AiProposedActionSchema,
} from './schemas/ai-proposed-action.schema';

@Module({
  imports: [
    EmployerPipelineModule,
    LLMModule,
    MongooseModule.forFeature([
      { name: EmployerAutopilotConfig.name, schema: EmployerAutopilotConfigSchema },
      { name: AiProposedAction.name, schema: AiProposedActionSchema },
    ]),
  ],
  controllers: [AiRecruiterController],
  providers: [AiRecruiterService],
  exports: [AiRecruiterService],
})
export class AiRecruiterModule {}
```

(`EmployerAiActionsService` from Task 2 is added to `providers`/`exports` in Task 6, alongside the other new services this phase introduces — avoids registering a provider before anything in this task consumes it.)

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && npx jest src/ai-recruiter/ai-recruiter.service.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 8: Run the full backend suite to confirm nothing broke**

Run: `cd backend && npx jest`
Expected: PASS — all suites (this file changed a shared service's constructor arity; confirm no other spec constructs `AiRecruiterService` directly without the new 4th arg)

- [ ] **Step 9: Commit**

```bash
git add backend/src/ai-recruiter/
git commit -m "feat(ai-recruiter): persist the Autopilot master toggle"
```

---

### Task 4: `AutopilotRulesService` — rule evaluation + idempotency

**Files:**
- Create: `backend/src/ai-recruiter/autopilot-rules.service.ts`
- Test: `backend/src/ai-recruiter/autopilot-rules.service.spec.ts`

**Interfaces:**
- Consumes: `AiRecruiterService.getOrCreateAutopilotConfig` (Task 3); `EmployerAiActionsService.existsFor`/`.create` (Task 2); the existing private `scoreApplicant`/`rationaleFor` logic in `AiRecruiterService` — **made non-private** (change `private scoreApplicant` → `scoreApplicant` and `private rationaleFor` → `rationaleFor` in `ai-recruiter.service.ts`, since this new service needs to call the same scoring `AiRecruiterService` already uses, rather than re-implementing it).
- Produces:
  ```ts
  evaluateApplicant(ownerId: string, applicant: EmployerApplicantDocument): Promise<void>
  sweepAll(ownerId: string): Promise<{ evaluated: number; proposed: number }>
  ```

- [ ] **Step 1: Un-privatize the two methods this task needs**

In `backend/src/ai-recruiter/ai-recruiter.service.ts`, change:
```ts
private scoreApplicant(app: EmployerApplicantDocument): number {
```
to:
```ts
scoreApplicant(app: EmployerApplicantDocument): number {
```
and:
```ts
private rationaleFor(app: EmployerApplicantDocument, score: number): string {
```
to:
```ts
rationaleFor(app: EmployerApplicantDocument, score: number): string {
```

- [ ] **Step 2: Write the failing tests**

```ts
// backend/src/ai-recruiter/autopilot-rules.service.spec.ts
import { Types } from 'mongoose';
import { AutopilotRulesService } from './autopilot-rules.service';

describe('AutopilotRulesService', () => {
  const ownerId = new Types.ObjectId().toString();
  const applicantId = new Types.ObjectId();

  const buildApplicant = (overrides: Partial<any> = {}) => ({
    _id: applicantId,
    stage: 'applied',
    rating: 0,
    skills: [],
    aiScore: 0,
    ...overrides,
  });

  const buildService = ({ config, alreadyProposed = false, score }: any) => {
    const aiRecruiterService: any = {
      getOrCreateAutopilotConfig: jest.fn().mockResolvedValue(config),
      scoreApplicant: jest.fn().mockReturnValue(score),
      rationaleFor: jest.fn().mockReturnValue('Because reasons'),
    };
    const actionsService: any = {
      existsFor: jest.fn().mockResolvedValue(alreadyProposed),
      create: jest.fn().mockResolvedValue({}),
    };
    const applicantModel: any = {
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([buildApplicant()]) }),
    };
    const service = new AutopilotRulesService(aiRecruiterService, actionsService, applicantModel);
    return { service, aiRecruiterService, actionsService };
  };

  it('does nothing when autopilot is disabled for this owner', async () => {
    const { service, actionsService } = buildService({
      config: { enabled: false, rules: [] },
      score: 20,
    });

    await service.evaluateApplicant(ownerId, buildApplicant());

    expect(actionsService.create).not.toHaveBeenCalled();
  });

  it('proposes a reject when score is below the reject threshold and the rule is enabled', async () => {
    const { service, actionsService } = buildService({
      config: {
        enabled: true,
        rules: [{ type: 'auto_propose_reject', scoreThreshold: 40, enabled: true }],
      },
      score: 20,
    });

    await service.evaluateApplicant(ownerId, buildApplicant());

    expect(actionsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'autopilot', actionType: 'reject' }),
    );
  });

  it('proposes an advance when score is above the advance threshold and the rule is enabled', async () => {
    const { service, actionsService } = buildService({
      config: {
        enabled: true,
        rules: [{ type: 'auto_propose_advance', scoreThreshold: 80, enabled: true }],
      },
      score: 90,
    });

    await service.evaluateApplicant(ownerId, buildApplicant());

    expect(actionsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'autopilot',
        actionType: 'advance_stage',
        payload: { targetStage: 'screening' },
      }),
    );
  });

  it('does not propose when the matching rule exists but is disabled', async () => {
    const { service, actionsService } = buildService({
      config: {
        enabled: true,
        rules: [{ type: 'auto_propose_reject', scoreThreshold: 40, enabled: false }],
      },
      score: 20,
    });

    await service.evaluateApplicant(ownerId, buildApplicant());

    expect(actionsService.create).not.toHaveBeenCalled();
  });

  it('does not double-propose when a proposal for this applicant+rule already exists', async () => {
    const { service, actionsService } = buildService({
      config: {
        enabled: true,
        rules: [{ type: 'auto_propose_reject', scoreThreshold: 40, enabled: true }],
      },
      score: 20,
      alreadyProposed: true,
    });

    await service.evaluateApplicant(ownerId, buildApplicant());

    expect(actionsService.create).not.toHaveBeenCalled();
  });

  it('sweepAll evaluates every applicant for this owner and reports counts', async () => {
    const { service } = buildService({
      config: {
        enabled: true,
        rules: [{ type: 'auto_propose_reject', scoreThreshold: 40, enabled: true }],
      },
      score: 20,
    });

    const result = await service.sweepAll(ownerId);

    expect(result.evaluated).toBe(1);
    expect(result.proposed).toBe(1);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && npx jest src/ai-recruiter/autopilot-rules.service.spec.ts`
Expected: FAIL — `Cannot find module './autopilot-rules.service'`

- [ ] **Step 4: Write the implementation**

```ts
// backend/src/ai-recruiter/autopilot-rules.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AiRecruiterService } from './ai-recruiter.service';
import { EmployerAiActionsService } from './employer-ai-actions.service';
import {
  EmployerApplicant,
  EmployerApplicantDocument,
} from '../employer-pipeline/schemas/employer-applicant.schema';

@Injectable()
export class AutopilotRulesService {
  constructor(
    private readonly aiRecruiterService: AiRecruiterService,
    private readonly actionsService: EmployerAiActionsService,
    @InjectModel(EmployerApplicant.name)
    private readonly applicantModel: Model<EmployerApplicantDocument>,
  ) {}

  /**
   * Evaluate one applicant against the owner's active rules, proposing an
   * action for at most one matching rule. Never throws — a rule-evaluation
   * failure must not break whatever created/updated the applicant.
   */
  async evaluateApplicant(
    ownerId: string,
    applicant: EmployerApplicantDocument,
  ): Promise<void> {
    try {
      const config = await this.aiRecruiterService.getOrCreateAutopilotConfig(ownerId);
      if (!config.enabled) return;

      const score = this.aiRecruiterService.scoreApplicant(applicant);
      const applicantId = applicant._id.toString();

      const rejectRule = config.rules.find(
        (r) => r.type === 'auto_propose_reject' && r.enabled,
      );
      if (rejectRule && score < rejectRule.scoreThreshold) {
        if (!(await this.actionsService.existsFor(applicantId, 'reject', 'autopilot'))) {
          await this.actionsService.create({
            ownerId,
            source: 'autopilot',
            actionType: 'reject',
            applicantId,
            jobId: applicant.jobId ? String(applicant.jobId) : undefined,
            payload: {},
            rationale: this.aiRecruiterService.rationaleFor(applicant, score),
          });
        }
        return;
      }

      const advanceRule = config.rules.find(
        (r) => r.type === 'auto_propose_advance' && r.enabled,
      );
      if (advanceRule && score > advanceRule.scoreThreshold) {
        if (!(await this.actionsService.existsFor(applicantId, 'advance_stage', 'autopilot'))) {
          await this.actionsService.create({
            ownerId,
            source: 'autopilot',
            actionType: 'advance_stage',
            applicantId,
            jobId: applicant.jobId ? String(applicant.jobId) : undefined,
            payload: { targetStage: 'screening' },
            rationale: this.aiRecruiterService.rationaleFor(applicant, score),
          });
        }
      }
    } catch {
      // Autopilot evaluation must never break the caller (applicant
      // creation, or a manual sweep). Silently skip this applicant.
    }
  }

  async sweepAll(ownerId: string): Promise<{ evaluated: number; proposed: number }> {
    const applicants = await this.applicantModel
      .find({ ownerId: new Types.ObjectId(ownerId) })
      .lean();

    let proposed = 0;
    for (const applicant of applicants) {
      const before = await this.actionsService.list(ownerId, 'pending');
      await this.evaluateApplicant(ownerId, applicant as any);
      const after = await this.actionsService.list(ownerId, 'pending');
      if (after.length > before.length) proposed++;
    }

    return { evaluated: applicants.length, proposed };
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx jest src/ai-recruiter/autopilot-rules.service.spec.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Register in the module**

```ts
// backend/src/ai-recruiter/ai-recruiter.module.ts — add to providers and exports:
import { AutopilotRulesService } from './autopilot-rules.service';
import { EmployerAiActionsService } from './employer-ai-actions.service';
import { EmployerInterviewsModule } from '../employer-interviews/employer-interviews.module';
import { EmployerMessagesModule } from '../employer-messages/employer-messages.module';

@Module({
  imports: [
    EmployerPipelineModule,
    LLMModule,
    EmployerInterviewsModule,
    EmployerMessagesModule,
    MongooseModule.forFeature([
      { name: EmployerAutopilotConfig.name, schema: EmployerAutopilotConfigSchema },
      { name: AiProposedAction.name, schema: AiProposedActionSchema },
    ]),
  ],
  controllers: [AiRecruiterController],
  providers: [AiRecruiterService, EmployerAiActionsService, AutopilotRulesService],
  exports: [AiRecruiterService, EmployerAiActionsService, AutopilotRulesService],
})
export class AiRecruiterModule {}
```

- [ ] **Step 7: Run the full backend suite**

Run: `cd backend && npx jest`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add backend/src/ai-recruiter/
git commit -m "feat(ai-recruiter): add AutopilotRulesService with idempotent rule evaluation"
```

---

### Task 5: Wire the event-driven trigger into the application bridge

**Files:**
- Modify: `backend/src/applications/applications.service.ts` (`bridgeApplicationToPipeline`)
- Modify: `backend/src/applications/applications.module.ts` (import `AiRecruiterModule`)
- Test: `backend/src/applications/applications.service.spec.ts` (extend if it exists; check first — if it doesn't exist for this method, add a focused new spec file `backend/src/applications/bridge-application-to-pipeline.spec.ts`)

**Interfaces:**
- Consumes: `AutopilotRulesService.evaluateApplicant(ownerId: string, applicant: EmployerApplicantDocument): Promise<void>` (Task 4)

- [ ] **Step 1: Check whether a spec already covers `bridgeApplicationToPipeline`**

Run: `cd backend && grep -rl "bridgeApplicationToPipeline" src/applications/*.spec.ts`
If a match is found, add the new tests into that file. If not, create `backend/src/applications/bridge-application-to-pipeline.spec.ts` for Step 2 below.

- [ ] **Step 2: Write the failing test**

```ts
// backend/src/applications/bridge-application-to-pipeline.spec.ts (only if no existing spec covers this method — otherwise add these cases to the existing file)
import { Types } from 'mongoose';

// This test targets whatever the existing bridgeApplicationToPipeline test
// harness constructs ApplicationsService with — extend that harness with an
// autopilotRulesService mock rather than rebuilding it from scratch. Below
// is the shape of the two cases to add:

it('evaluates the applicant with AutopilotRulesService only when the applicant was newly created', async () => {
  // Arrange: upsertApplicant's mock returns a doc where createdAt === updatedAt
  // (newly inserted). Assert autopilotRulesService.evaluateApplicant was
  // called once with (ownerId, applicant).
});

it('does not re-evaluate an applicant that already existed (re-apply / update path)', async () => {
  // Arrange: upsertApplicant's mock returns a doc where createdAt !== updatedAt.
  // Assert autopilotRulesService.evaluateApplicant was NOT called.
});
```

(Written as a shape rather than literal code because the exact mock harness for `ApplicationsService`'s constructor — which has many dependencies per Task-gathering notes — must match whatever the existing spec file already builds. If no existing spec exists, construct `ApplicationsService` directly with all its real constructor dependencies stubbed, following the exact pattern of `employer-ai-actions.service.spec.ts` in Task 2.)

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && npx jest src/applications --testPathPattern="bridge"`
Expected: FAIL — `autopilotRulesService` not injected / evaluateApplicant never called

- [ ] **Step 4: Modify `ApplicationsService`**

In `backend/src/applications/applications.service.ts`, add `AutopilotRulesService` to the constructor:
```ts
import { AutopilotRulesService } from '../ai-recruiter/autopilot-rules.service';

// In the constructor parameter list, add:
private readonly autopilotRulesService: AutopilotRulesService,
```

In `bridgeApplicationToPipeline`, immediately after the existing `upsertApplicant(...)` call (inside its existing try/catch — this whole method is already documented as "must never break the application save that triggered it"), add:
```ts
const applicant = await this.employerPipelineService.upsertApplicant({ /* ...existing args... */ });

// Newly-created applicants only — compare createdAt/updatedAt rather than
// adding a return-shape change to a shared method other callers rely on.
// A re-apply/update to an existing applicant should not re-trigger
// autopilot evaluation.
const isNewlyCreated =
  applicant.createdAt && applicant.updatedAt &&
  applicant.createdAt.getTime() === applicant.updatedAt.getTime();

if (isNewlyCreated) {
  try {
    await this.autopilotRulesService.evaluateApplicant(ownerId, applicant);
  } catch {
    // Autopilot evaluation must never break the application-save path
    // that triggered it — already defensive inside evaluateApplicant
    // itself, but belt-and-suspenders here too.
  }
}
```

(Exact variable names `applicant`/`ownerId` must match what the surrounding existing code in `bridgeApplicationToPipeline` already uses — read the method first and adapt to its actual local variable names before inserting.)

- [ ] **Step 5: Import `AiRecruiterModule` in `ApplicationsModule`**

```ts
// backend/src/applications/applications.module.ts
import { AiRecruiterModule } from '../ai-recruiter/ai-recruiter.module';

@Module({
  imports: [
    // ...existing imports...
    AiRecruiterModule,
  ],
  // ...
})
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && npx jest src/applications`
Expected: PASS

- [ ] **Step 7: Run the full backend suite**

Run: `cd backend && npx jest`
Expected: PASS — this is the highest-risk task in the plan for accidental breakage (touches the application-save path); confirm zero regressions before moving on.

- [ ] **Step 8: Commit**

```bash
git add backend/src/applications/ backend/src/ai-recruiter/
git commit -m "feat(ai-recruiter): trigger Autopilot evaluation when a new applicant is created"
```

---

### Task 6: "Run now" + real approve/dismiss endpoints

**Files:**
- Modify: `backend/src/ai-recruiter/ai-recruiter.controller.ts`
- Create: `backend/src/ai-recruiter/dto/decide-proposed-action.dto.ts` (already created in Task 2 — no change needed here, just consumed)

**Interfaces:**
- Consumes: `AutopilotRulesService.sweepAll` (Task 4), `EmployerAiActionsService.list`/`.decide` (Task 2)
- Produces new routes:
  - `POST /employer/ai/autopilot/run-now` → `{ evaluated: number; proposed: number }`
  - `GET /employer/ai/proposed-actions?status=pending` → `AiProposedActionDocument[]`
  - `POST /employer/ai/proposed-actions/:id/decide` body `{ decision: 'approve' | 'reject' }` → decided `AiProposedActionDocument`

- [ ] **Step 1: Write the failing controller test**

```ts
// backend/src/ai-recruiter/ai-recruiter.controller.spec.ts (new file — none exists today)
import { Test, TestingModule } from '@nestjs/testing';
import { AiRecruiterController } from './ai-recruiter.controller';
import { AiRecruiterService } from './ai-recruiter.service';
import { AutopilotRulesService } from './autopilot-rules.service';
import { EmployerAiActionsService } from './employer-ai-actions.service';

describe('AiRecruiterController — new Autopilot endpoints', () => {
  let controller: AiRecruiterController;
  const aiRecruiterService = {} as any;
  const autopilotRulesService = { sweepAll: jest.fn().mockResolvedValue({ evaluated: 5, proposed: 2 }) };
  const actionsService = {
    list: jest.fn().mockResolvedValue([]),
    decide: jest.fn().mockResolvedValue({ status: 'approved' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiRecruiterController],
      providers: [
        { provide: AiRecruiterService, useValue: aiRecruiterService },
        { provide: AutopilotRulesService, useValue: autopilotRulesService },
        { provide: EmployerAiActionsService, useValue: actionsService },
      ],
    }).compile();
    controller = module.get(AiRecruiterController);
  });

  const req = { user: { _id: 'employer-1' } };

  it('runNow sweeps the applicant pool via AutopilotRulesService', async () => {
    const result = await controller.runNow(req as any);
    expect(autopilotRulesService.sweepAll).toHaveBeenCalledWith('employer-1');
    expect(result).toEqual({ evaluated: 5, proposed: 2 });
  });

  it('listProposedActions passes the status query through', async () => {
    await controller.listProposedActions('pending', req as any);
    expect(actionsService.list).toHaveBeenCalledWith('employer-1', 'pending');
  });

  it('decideProposedAction calls decide with employerId + decision', async () => {
    await controller.decideProposedAction('proposal-1', { decision: 'approve' } as any, req as any);
    expect(actionsService.decide).toHaveBeenCalledWith('employer-1', 'proposal-1', 'approve', 'employer-1');
  });

  it('getAutopilot enriches each queue item with its matching pending proposal id', async () => {
    aiRecruiterService.getAutopilot = jest.fn().mockResolvedValue({
      enabled: true, status: 'active',
      stats: {}, rules: [],
      queue: [{ applicantId: 'app-1', name: 'Sarah Chen', proposedAction: 'advance_to_screening' }],
      activity: [],
    });
    actionsService.list = jest.fn().mockResolvedValue([
      { _id: { toString: () => 'proposal-9' }, applicantId: { toString: () => 'app-1' } },
    ]);

    const result = await controller.getAutopilot(req as any);

    expect(result.queue[0].proposalId).toBe('proposal-9');
  });

  it('getAutopilot leaves a queue item without a matching proposal unchanged (no proposalId)', async () => {
    aiRecruiterService.getAutopilot = jest.fn().mockResolvedValue({
      enabled: true, status: 'active',
      stats: {}, rules: [],
      queue: [{ applicantId: 'app-2', name: 'Alex Kim', proposedAction: 'request_more_info' }],
      activity: [],
    });
    actionsService.list = jest.fn().mockResolvedValue([]);

    const result = await controller.getAutopilot(req as any);

    expect(result.queue[0].proposalId).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/ai-recruiter/ai-recruiter.controller.spec.ts`
Expected: FAIL — `controller.runNow is not a function`

- [ ] **Step 3: Modify the controller**

```ts
// backend/src/ai-recruiter/ai-recruiter.controller.ts — add imports and 3 new methods
import { Get, Param, Query } from '@nestjs/common';
import { AutopilotRulesService } from './autopilot-rules.service';
import { EmployerAiActionsService } from './employer-ai-actions.service';
import { DecideProposedActionDto } from './dto/decide-proposed-action.dto';

// Update constructor:
constructor(
  private readonly aiRecruiterService: AiRecruiterService,
  private readonly autopilotRulesService: AutopilotRulesService,
  private readonly actionsService: EmployerAiActionsService,
) {}

// Replace the EXISTING getAutopilot() method body — it must enrich each
// queue item with the id of its matching pending AiProposedAction (if one
// exists), so the frontend (Task 7) has something real to approve/dismiss.
// Deliberately done here rather than inside AiRecruiterService.getAutopilot
// itself, to avoid growing that service's constructor for a concern that's
// really about composing two already-separate services' data.
@Get('autopilot')
async getAutopilot(@Request() req) {
  const employerId = req.user._id.toString();
  const result = await this.aiRecruiterService.getAutopilot(employerId);
  const pending = await this.actionsService.list(employerId, 'pending' as any);
  const byApplicantId = new Map(
    pending.map((p: any) => [p.applicantId.toString(), p._id.toString()]),
  );
  const queue = (result.queue || []).map((item: any) => {
    const proposalId = byApplicantId.get(item.applicantId);
    return proposalId ? { ...item, proposalId } : item;
  });
  return { ...result, queue };
}

// Add:
@Post('autopilot/run-now')
async runNow(@Request() req) {
  const employerId = req.user._id.toString();
  return this.autopilotRulesService.sweepAll(employerId);
}

@Get('proposed-actions')
async listProposedActions(@Query('status') status: string, @Request() req) {
  const employerId = req.user._id.toString();
  return this.actionsService.list(employerId, status as any);
}

@Post('proposed-actions/:id/decide')
async decideProposedAction(
  @Param('id') id: string,
  @Body() dto: DecideProposedActionDto,
  @Request() req,
) {
  const employerId = req.user._id.toString();
  return this.actionsService.decide(employerId, id, dto.decision, employerId);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest src/ai-recruiter/ai-recruiter.controller.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Live-verify against the running backend**

```bash
# With the backend running and an employer token available:
curl -s -X POST http://localhost:8000/api/employer/ai/autopilot/run-now -H "Authorization: Bearer $ETOK"
curl -s http://localhost:8000/api/employer/ai/proposed-actions?status=pending -H "Authorization: Bearer $ETOK"
```
Expected: both return valid JSON (empty array is fine — proves routing, guards, and DI wiring are correct end-to-end, not just unit-mocked).

- [ ] **Step 6: Commit**

```bash
git add backend/src/ai-recruiter/
git commit -m "feat(ai-recruiter): add Autopilot run-now and proposed-action approve/dismiss endpoints"
```

---

### Task 7: Frontend — real queue actions on `/employer/autopilot`

**Files:**
- Modify: `frontend/src/pages/employer/autopilot.jsx`
- Modify: `frontend/src/services/employerApi.js` (`aiRecruiterApi`)

**Interfaces:**
- Consumes new backend routes from Task 6.

- [ ] **Step 1: Add API methods**

```js
// frontend/src/services/employerApi.js — inside aiRecruiterApi
runAutopilotNow: () =>
  apiCall('/api/employer/ai/autopilot/run-now', { method: 'POST' }),
listProposedActions: (status) =>
  apiCall(`/api/employer/ai/proposed-actions${status ? `?status=${status}` : ''}`),
decideProposedAction: (id, decision) =>
  apiCall(`/api/employer/ai/proposed-actions/${id}/decide`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  }),
```

- [ ] **Step 2: Read the current queue-rendering section of `autopilot.jsx`**

Before editing, read the exact JSX around where `queueVals` (the review-queue items) are rendered (lines ~584-674 per current file) to match existing styling/structure conventions rather than guessing indentation/classnames.

- [ ] **Step 3: Add Approve/Dismiss buttons and a "Run now" button**

Add, near the existing queue rendering, a decide handler:
```jsx
const [deciding, setDeciding] = useState({}); // { [proposalId]: boolean }

const decide = async (proposalId, decision) => {
  setDeciding((prev) => ({ ...prev, [proposalId]: true }));
  try {
    await aiRecruiterApi.decideProposedAction(proposalId, decision);
    await load(); // re-fetch — the queue and activity log both change
  } catch (err) {
    console.error('Error deciding proposed action:', err);
  } finally {
    setDeciding((prev) => ({ ...prev, [proposalId]: false }));
  }
};

const [runningNow, setRunningNow] = useState(false);
const runNow = async () => {
  setRunningNow(true);
  try {
    await aiRecruiterApi.runAutopilotNow();
    await load();
  } catch (err) {
    console.error('Error running autopilot sweep:', err);
  } finally {
    setRunningNow(false);
  }
};
```

Within each queue-item's render, add two buttons calling `decide(item.proposalId, 'approve')` / `decide(item.proposalId, 'reject')`. `item.proposalId` comes from Task 6's controller-level enrichment of `GET /employer/ai/autopilot`'s queue — it is present when a matching pending `AiProposedAction` exists for that applicant, and absent otherwise (a rule matched the deterministic preview but a duplicate-guard or timing gap meant nothing was actually proposed yet). Render the Approve/Dismiss buttons only when `item.proposalId` is present; when absent, show the row as informational-only (no action to decide yet).

Add a "Run now" button near the queue header, disabled while `runningNow`, calling `runNow()`.

- [ ] **Step 4: Build the frontend to confirm no syntax errors**

Run: `cd frontend && npx next build`
Expected: build succeeds

- [ ] **Step 5: Manual verification**

Start both servers, sign in as the seeded employer test account, navigate to `/employer/autopilot`, toggle Autopilot on, click "Run now", confirm the queue shows items with working Approve/Dismiss buttons that actually change an applicant's stage (verify via `/employer/candidates` or a direct API call).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/employer/autopilot.jsx frontend/src/services/employerApi.js
git commit -m "feat(employer): real Approve/Dismiss and Run now on the Autopilot queue"
```

---

## Phase 3 — Copilot

### Task 8: Recruiter Copilot tools

**Files:**
- Create: `backend/src/ai-recruiter/copilot/recruiter-copilot.tools.ts`
- Create: `backend/src/ai-recruiter/copilot/recruiter-copilot.definition.ts`
- Test: `backend/src/ai-recruiter/copilot/recruiter-copilot.tools.spec.ts`

**Interfaces:**
- Consumes: `AgentTool`, `AgentToolContext`, `AgentDefinition` from `backend/src/agent-runtime/agent-runtime.types.ts` (existing); `EmployerApplicant` model (read); `EmployerAiActionsService.create` (Task 2); `LLMFeature.RECRUITER_COPILOT` (existing).
- Produces:
  ```ts
  export const RECRUITER_COPILOT_TYPE = 'recruiter-copilot';
  export const RECRUITER_COPILOT: AgentDefinition;
  export interface RecruiterCopilotToolDeps {
    applicantModel: Model<EmployerApplicantDocument>;
    jobModel: Model<EmployerJobDocument>;
    actionsService: EmployerAiActionsService;
  }
  export function buildRecruiterCopilotTools(deps: RecruiterCopilotToolDeps): AgentTool[];
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// backend/src/ai-recruiter/copilot/recruiter-copilot.tools.spec.ts
import { Types } from 'mongoose';
import { buildRecruiterCopilotTools } from './recruiter-copilot.tools';

describe('buildRecruiterCopilotTools', () => {
  const ownerId = new Types.ObjectId().toString();
  const applicantId = new Types.ObjectId();
  const ctx = { userId: ownerId, run: { input: {} } } as any;

  const buildDeps = () => {
    const applicant = {
      _id: applicantId, candidateName: 'Sarah Chen', stage: 'screening',
      skills: ['TypeScript'], aiScore: 80, rating: 4,
    };
    const applicantModel: any = {
      find: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([applicant]) }),
      }),
      findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(applicant) }),
      countDocuments: jest.fn().mockResolvedValue(3),
    };
    const jobModel: any = {
      findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'job-1', title: 'Backend Engineer' }) }),
    };
    const actionsService: any = { create: jest.fn().mockResolvedValue({ _id: 'proposal-1' }) };
    return { applicantModel, jobModel, actionsService, applicant };
  };

  it('search_applicants returns a list without requiring an approval', async () => {
    const deps = buildDeps();
    const tools = buildRecruiterCopilotTools(deps);
    const tool = tools.find((t) => t.name === 'search_applicants')!;

    const result = await tool.handler(ctx, { jobId: 'job-1' });

    expect(deps.applicantModel.find).toHaveBeenCalled();
    expect(result.applicants).toHaveLength(1);
    expect(result.applicants[0].name).toBe('Sarah Chen');
  });

  it('get_applicant_detail returns the full record for a real applicant id', async () => {
    const deps = buildDeps();
    const tools = buildRecruiterCopilotTools(deps);
    const tool = tools.find((t) => t.name === 'get_applicant_detail')!;

    const result = await tool.handler(ctx, { applicantId: applicantId.toString() });

    expect(result.applicant.name).toBe('Sarah Chen');
  });

  it('get_applicant_detail returns an error, never throws, for an unknown id', async () => {
    const deps = buildDeps();
    deps.applicantModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    const tools = buildRecruiterCopilotTools(deps);
    const tool = tools.find((t) => t.name === 'get_applicant_detail')!;

    const result = await tool.handler(ctx, { applicantId: new Types.ObjectId().toString() });

    expect(result.error).toBeDefined();
  });

  it('propose_advance_stage creates an AiProposedAction, never touches the applicant directly', async () => {
    const deps = buildDeps();
    const tools = buildRecruiterCopilotTools(deps);
    const tool = tools.find((t) => t.name === 'propose_advance_stage')!;

    const result = await tool.handler(ctx, {
      applicantId: applicantId.toString(),
      targetStage: 'interview',
      rationale: 'Strong technical interview',
    });

    expect(deps.actionsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId,
        source: 'copilot',
        actionType: 'advance_stage',
        applicantId: applicantId.toString(),
        payload: { targetStage: 'interview' },
      }),
    );
    expect(result.proposedActionId).toBe('proposal-1');
  });

  it('propose_reject creates a reject-type AiProposedAction', async () => {
    const deps = buildDeps();
    const tools = buildRecruiterCopilotTools(deps);
    const tool = tools.find((t) => t.name === 'propose_reject')!;

    await tool.handler(ctx, { applicantId: applicantId.toString(), rationale: 'Not a fit' });

    expect(deps.actionsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'reject' }),
    );
  });

  it('propose_schedule_interview creates a schedule_interview-type AiProposedAction with the given time', async () => {
    const deps = buildDeps();
    const tools = buildRecruiterCopilotTools(deps);
    const tool = tools.find((t) => t.name === 'propose_schedule_interview')!;

    await tool.handler(ctx, {
      applicantId: applicantId.toString(),
      type: 'video',
      proposedAt: '2026-09-01T15:00:00.000Z',
      durationMins: 30,
      rationale: 'Ready for the next round',
    });

    expect(deps.actionsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'schedule_interview',
        payload: { type: 'video', proposedAt: '2026-09-01T15:00:00.000Z', durationMins: 30 },
      }),
    );
  });

  it('propose_send_message creates a send_message-type AiProposedAction with the drafted text', async () => {
    const deps = buildDeps();
    const tools = buildRecruiterCopilotTools(deps);
    const tool = tools.find((t) => t.name === 'propose_send_message')!;

    await tool.handler(ctx, {
      applicantId: applicantId.toString(),
      draftText: 'Thanks for interviewing!',
      rationale: 'Post-interview follow up',
    });

    expect(deps.actionsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'send_message',
        payload: { draftText: 'Thanks for interviewing!' },
      }),
    );
  });

  it('every action tool returns {error} rather than throwing when actionsService.create fails', async () => {
    const deps = buildDeps();
    deps.actionsService.create.mockRejectedValue(new Error('db down'));
    const tools = buildRecruiterCopilotTools(deps);
    const tool = tools.find((t) => t.name === 'propose_reject')!;

    const result = await tool.handler(ctx, { applicantId: applicantId.toString(), rationale: 'x' });

    expect(result.error).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest src/ai-recruiter/copilot/recruiter-copilot.tools.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the tools file**

```ts
// backend/src/ai-recruiter/copilot/recruiter-copilot.tools.ts
import { Model, Types } from 'mongoose';
import { AgentTool, AgentToolContext } from '../../agent-runtime/agent-runtime.types';
import { EmployerApplicantDocument } from '../../employer-pipeline/schemas/employer-applicant.schema';
import { EmployerAiActionsService } from '../employer-ai-actions.service';

export interface RecruiterCopilotToolDeps {
  applicantModel: Model<EmployerApplicantDocument>;
  actionsService: EmployerAiActionsService;
}

function toApplicantSummary(app: any) {
  return {
    id: app._id.toString(),
    name: app.candidateName || 'Unknown',
    stage: app.stage,
    skills: app.skills || [],
    aiScore: app.aiScore || 0,
    rating: app.rating || 0,
  };
}

export function buildRecruiterCopilotTools(deps: RecruiterCopilotToolDeps): AgentTool[] {
  const searchApplicants: AgentTool = {
    name: 'search_applicants',
    description:
      'Search this employer\'s applicants, optionally filtered by job, stage, or minimum score. Read-only — use this or get_applicant_detail before proposing any action on a named candidate, to ground the name to a real applicant id.',
    parameters: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Optional EmployerJob id to filter by' },
        stage: { type: 'string', description: 'Optional stage filter: applied|screening|interview|offer|hired|rejected' },
        minScore: { type: 'number', description: 'Optional minimum aiScore filter' },
        limit: { type: 'number', description: 'Max results, default 20' },
      },
      required: [],
    },
    handler: async (ctx: AgentToolContext, args: any = {}) => {
      try {
        const query: any = { ownerId: new Types.ObjectId(ctx.userId) };
        if (args.jobId) query.jobId = new Types.ObjectId(args.jobId);
        if (args.stage) query.stage = args.stage;
        if (typeof args.minScore === 'number') query.aiScore = { $gte: args.minScore };

        const applicants = await deps.applicantModel
          .find(query)
          .limit(args.limit || 20)
          .lean();

        return { applicants: applicants.map(toApplicantSummary) };
      } catch (err: any) {
        return { error: err?.message || 'Search failed', applicants: [] };
      }
    },
  };

  const getApplicantDetail: AgentTool = {
    name: 'get_applicant_detail',
    description: 'Get one applicant\'s full record by id, including stage history and notes.',
    parameters: {
      type: 'object',
      properties: { applicantId: { type: 'string' } },
      required: ['applicantId'],
    },
    handler: async (ctx: AgentToolContext, args: any = {}) => {
      try {
        const applicant = await deps.applicantModel
          .findOne({ _id: args.applicantId, ownerId: new Types.ObjectId(ctx.userId) })
          .lean();
        if (!applicant) return { error: 'Applicant not found' };
        return { applicant: { ...toApplicantSummary(applicant), notes: (applicant as any).notes || [] } };
      } catch (err: any) {
        return { error: err?.message || 'Lookup failed' };
      }
    },
  };

  const getJobStats: AgentTool = {
    name: 'get_job_stats',
    description: 'Funnel counts (applied/screening/interview/offer/hired/rejected) for one job.',
    parameters: {
      type: 'object',
      properties: { jobId: { type: 'string' } },
      required: ['jobId'],
    },
    handler: async (ctx: AgentToolContext, args: any = {}) => {
      try {
        const stages = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];
        const counts: Record<string, number> = {};
        for (const stage of stages) {
          counts[stage] = await deps.applicantModel.countDocuments({
            ownerId: new Types.ObjectId(ctx.userId),
            jobId: new Types.ObjectId(args.jobId),
            stage,
          });
        }
        return { counts };
      } catch (err: any) {
        return { error: err?.message || 'Stats lookup failed' };
      }
    },
  };

  const proposeAdvanceStage: AgentTool = {
    name: 'propose_advance_stage',
    description:
      'Propose advancing a named applicant to a new stage. Creates a pending approval — does NOT change anything until the employer confirms. applicantId must come from search_applicants or get_applicant_detail, never guessed.',
    parameters: {
      type: 'object',
      properties: {
        applicantId: { type: 'string' },
        targetStage: { type: 'string', description: 'screening|interview|offer|hired' },
        rationale: { type: 'string' },
      },
      required: ['applicantId', 'targetStage', 'rationale'],
    },
    handler: async (ctx: AgentToolContext, args: any = {}) => {
      try {
        const proposal = await deps.actionsService.create({
          ownerId: ctx.userId,
          source: 'copilot',
          actionType: 'advance_stage',
          applicantId: args.applicantId,
          payload: { targetStage: args.targetStage },
          rationale: args.rationale,
        });
        return { proposedActionId: (proposal as any)._id.toString(), summary: `Proposed advancing to ${args.targetStage}, awaiting your approval.` };
      } catch (err: any) {
        return { error: err?.message || 'Could not create proposal' };
      }
    },
  };

  const proposeReject: AgentTool = {
    name: 'propose_reject',
    description:
      'Propose rejecting a named applicant. Creates a pending approval — does NOT change anything until the employer confirms.',
    parameters: {
      type: 'object',
      properties: {
        applicantId: { type: 'string' },
        rationale: { type: 'string' },
      },
      required: ['applicantId', 'rationale'],
    },
    handler: async (ctx: AgentToolContext, args: any = {}) => {
      try {
        const proposal = await deps.actionsService.create({
          ownerId: ctx.userId,
          source: 'copilot',
          actionType: 'reject',
          applicantId: args.applicantId,
          payload: {},
          rationale: args.rationale,
        });
        return { proposedActionId: (proposal as any)._id.toString(), summary: 'Proposed rejecting this applicant, awaiting your approval.' };
      } catch (err: any) {
        return { error: err?.message || 'Could not create proposal' };
      }
    },
  };

  const proposeScheduleInterview: AgentTool = {
    name: 'propose_schedule_interview',
    description:
      'Propose scheduling an interview for a named applicant. Creates a pending approval — no interview is actually scheduled until the employer confirms.',
    parameters: {
      type: 'object',
      properties: {
        applicantId: { type: 'string' },
        type: { type: 'string', description: 'phone|video|onsite' },
        proposedAt: { type: 'string', description: 'ISO 8601 datetime' },
        durationMins: { type: 'number' },
        rationale: { type: 'string' },
      },
      required: ['applicantId', 'rationale'],
    },
    handler: async (ctx: AgentToolContext, args: any = {}) => {
      try {
        const proposal = await deps.actionsService.create({
          ownerId: ctx.userId,
          source: 'copilot',
          actionType: 'schedule_interview',
          applicantId: args.applicantId,
          payload: { type: args.type, proposedAt: args.proposedAt, durationMins: args.durationMins },
          rationale: args.rationale,
        });
        return { proposedActionId: (proposal as any)._id.toString(), summary: 'Proposed an interview time, awaiting your approval.' };
      } catch (err: any) {
        return { error: err?.message || 'Could not create proposal' };
      }
    },
  };

  const proposeSendMessage: AgentTool = {
    name: 'propose_send_message',
    description:
      'Draft an outreach message to a named applicant. Creates a pending approval — the employer sees and can edit the exact text before it can send.',
    parameters: {
      type: 'object',
      properties: {
        applicantId: { type: 'string' },
        draftText: { type: 'string' },
        rationale: { type: 'string' },
      },
      required: ['applicantId', 'draftText', 'rationale'],
    },
    handler: async (ctx: AgentToolContext, args: any = {}) => {
      try {
        const proposal = await deps.actionsService.create({
          ownerId: ctx.userId,
          source: 'copilot',
          actionType: 'send_message',
          applicantId: args.applicantId,
          payload: { draftText: args.draftText },
          rationale: args.rationale,
        });
        return { proposedActionId: (proposal as any)._id.toString(), summary: 'Drafted a message, awaiting your approval before it sends.' };
      } catch (err: any) {
        return { error: err?.message || 'Could not create proposal' };
      }
    },
  };

  return [
    searchApplicants,
    getApplicantDetail,
    getJobStats,
    proposeAdvanceStage,
    proposeReject,
    proposeScheduleInterview,
    proposeSendMessage,
  ];
}
```

- [ ] **Step 4: Write the agent definition**

```ts
// backend/src/ai-recruiter/copilot/recruiter-copilot.definition.ts
import { AgentDefinition } from '../../agent-runtime/agent-runtime.types';
import { LLMFeature } from '../../llm/llm-routing.service';

export const RECRUITER_COPILOT_TYPE = 'recruiter-copilot';

export const RECRUITER_COPILOT: AgentDefinition = {
  agentType: RECRUITER_COPILOT_TYPE,
  feature: LLMFeature.RECRUITER_COPILOT,
  toolNames: [
    'search_applicants',
    'get_applicant_detail',
    'get_job_stats',
    'propose_advance_stage',
    'propose_reject',
    'propose_schedule_interview',
    'propose_send_message',
  ],
  maxSteps: 12,
  maxTokens: 40000,
  systemPrompt: [
    'You are a recruiting copilot inside an employer hiring platform.',
    'Before proposing any action on a NAMED candidate, you MUST first call',
    'search_applicants or get_applicant_detail to ground that name to a real',
    'applicant id. Never guess or invent an applicant id.',
    '',
    'Every action you take (advance stage, reject, schedule an interview,',
    'send a message) creates a PENDING PROPOSAL that the employer must',
    'explicitly approve — nothing you propose happens automatically. Always',
    'include a clear, specific rationale when proposing an action.',
    '',
    'Read tools (search_applicants, get_applicant_detail, get_job_stats) run',
    'immediately and cost nothing extra to call — use them freely to ground',
    'your answers in real data rather than guessing.',
  ].join('\n'),
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx jest src/ai-recruiter/copilot/recruiter-copilot.tools.spec.ts`
Expected: PASS (9 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/src/ai-recruiter/copilot/
git commit -m "feat(ai-recruiter): add Recruiter Copilot tools and agent definition"
```

---

### Task 9: Registrar + module wiring

**Files:**
- Create: `backend/src/ai-recruiter/copilot/recruiter-copilot.registrar.ts`
- Modify: `backend/src/ai-recruiter/ai-recruiter.module.ts`

**Interfaces:**
- Consumes: `ToolRegistry`, `AgentDefinitionRegistry` from `backend/src/agent-runtime/` (existing); `buildRecruiterCopilotTools`, `RECRUITER_COPILOT` (Task 8).

- [ ] **Step 1: Write the registrar, mirroring the candidate Job-Search Copilot's `CopilotRegistrar` exactly**

```ts
// backend/src/ai-recruiter/copilot/recruiter-copilot.registrar.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ToolRegistry } from '../../agent-runtime/tool-registry.service';
import { AgentDefinitionRegistry } from '../../agent-runtime/agent-definition.registry';
import { EmployerApplicant, EmployerApplicantDocument } from '../../employer-pipeline/schemas/employer-applicant.schema';
import { EmployerAiActionsService } from '../employer-ai-actions.service';
import { buildRecruiterCopilotTools } from './recruiter-copilot.tools';
import { RECRUITER_COPILOT } from './recruiter-copilot.definition';

@Injectable()
export class RecruiterCopilotRegistrar implements OnModuleInit {
  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly definitionRegistry: AgentDefinitionRegistry,
    @InjectModel(EmployerApplicant.name)
    private readonly applicantModel: Model<EmployerApplicantDocument>,
    private readonly actionsService: EmployerAiActionsService,
  ) {}

  onModuleInit() {
    const tools = buildRecruiterCopilotTools({
      applicantModel: this.applicantModel,
      actionsService: this.actionsService,
    });
    tools.forEach((tool) => this.toolRegistry.register(tool));
    this.definitionRegistry.register(RECRUITER_COPILOT);
  }
}
```

- [ ] **Step 2: Wire into the module**

```ts
// backend/src/ai-recruiter/ai-recruiter.module.ts
import { AgentRuntimeModule } from '../agent-runtime/agent-runtime.module';
import { RecruiterCopilotRegistrar } from './copilot/recruiter-copilot.registrar';

@Module({
  imports: [
    EmployerPipelineModule,
    LLMModule,
    EmployerInterviewsModule,
    EmployerMessagesModule,
    AgentRuntimeModule,
    MongooseModule.forFeature([
      { name: EmployerAutopilotConfig.name, schema: EmployerAutopilotConfigSchema },
      { name: AiProposedAction.name, schema: AiProposedActionSchema },
    ]),
  ],
  controllers: [AiRecruiterController],
  providers: [
    AiRecruiterService,
    EmployerAiActionsService,
    AutopilotRulesService,
    RecruiterCopilotRegistrar,
  ],
  exports: [AiRecruiterService, EmployerAiActionsService, AutopilotRulesService],
})
export class AiRecruiterModule {}
```

(Verify the exact export name is `AgentRuntimeModule` at `backend/src/agent-runtime/agent-runtime.module.ts` before this step — the ground-truth research confirmed `copilot.module.ts` imports it by this name, but confirm the file path/casing directly if the import fails to resolve.)

- [ ] **Step 3: Verify the app boots**

Run: `cd backend && npm run build`
Expected: compiles with no errors (this task has no new testable logic of its own — Task 8's tools already have full coverage; this task is pure DI wiring, verified by successful compilation + the app actually starting)

Run: `cd backend && timeout 15 npm run start:dev || true` and check the log for `RecruiterCopilotRegistrar` initializing without error and no `UnknownDependenciesException`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/ai-recruiter/
git commit -m "feat(ai-recruiter): register Recruiter Copilot tools with agent-runtime"
```

---

### Task 10: Controller — swap single-turn chat for the agent-runtime loop

**Files:**
- Modify: `backend/src/ai-recruiter/ai-recruiter.controller.ts` (`copilot` endpoint)
- Create: `backend/src/ai-recruiter/copilot/extract-copilot-reply.ts`
- Test: `backend/src/ai-recruiter/copilot/extract-copilot-reply.spec.ts`

**Interfaces:**
- Consumes: `AgentRuntimeService.run(agentType, userId, input): Promise<AgentRunDocument>` (existing); `AgentRunStep` shape (existing, from `agent-runtime/schemas/agent-run.schema.ts`).
- Produces:
  ```ts
  export function extractCopilotReply(run: AgentRunDocument): {
    reply: string;
    actions: Array<{ type: string; label: string; proposedActionId?: string }>;
  }
  ```

- [ ] **Step 1: Write the failing test for reply extraction**

```ts
// backend/src/ai-recruiter/copilot/extract-copilot-reply.spec.ts
import { extractCopilotReply } from './extract-copilot-reply';

describe('extractCopilotReply', () => {
  it('extracts the text of the last final step as the reply', () => {
    const run: any = {
      status: 'completed',
      steps: [
        { type: 'llm', at: new Date() },
        { type: 'final', text: 'Here are your top candidates.', at: new Date() },
      ],
    };

    const result = extractCopilotReply(run);

    expect(result.reply).toBe('Here are your top candidates.');
  });

  it('derives an action entry for each propose_* tool call, using its tool_result output', () => {
    const run: any = {
      status: 'completed',
      steps: [
        {
          type: 'tool_call', tool: 'propose_advance_stage',
          args: { applicantId: 'a1', targetStage: 'interview' }, at: new Date(),
        },
        {
          type: 'tool_result', tool: 'propose_advance_stage',
          output: { proposedActionId: 'p1', summary: 'Proposed advancing to interview, awaiting your approval.' },
          at: new Date(),
        },
        { type: 'final', text: 'Done — check your Approvals.', at: new Date() },
      ],
    };

    const result = extractCopilotReply(run);

    expect(result.actions).toEqual([
      { type: 'propose_advance_stage', label: 'Proposed advancing to interview, awaiting your approval.', proposedActionId: 'p1' },
    ]);
  });

  it('ignores read-only tool calls (search_applicants etc) when deriving actions', () => {
    const run: any = {
      status: 'completed',
      steps: [
        { type: 'tool_call', tool: 'search_applicants', args: {}, at: new Date() },
        { type: 'tool_result', tool: 'search_applicants', output: { applicants: [] }, at: new Date() },
        { type: 'final', text: 'No applicants matched.', at: new Date() },
      ],
    };

    const result = extractCopilotReply(run);

    expect(result.actions).toEqual([]);
  });

  it('falls back to a clear message when the run failed rather than crashing', () => {
    const run: any = { status: 'failed', error: 'Quota exceeded', steps: [] };

    const result = extractCopilotReply(run);

    expect(result.reply).toContain('Quota exceeded');
    expect(result.actions).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/ai-recruiter/copilot/extract-copilot-reply.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```ts
// backend/src/ai-recruiter/copilot/extract-copilot-reply.ts
import { AgentRunDocument, AgentRunStep } from '../../agent-runtime/schemas/agent-run.schema';

const ACTION_TOOL_NAMES = new Set([
  'propose_advance_stage',
  'propose_reject',
  'propose_schedule_interview',
  'propose_send_message',
]);

export function extractCopilotReply(run: AgentRunDocument): {
  reply: string;
  actions: Array<{ type: string; label: string; proposedActionId?: string }>;
} {
  if (run.status === 'failed') {
    return {
      reply: run.error
        ? `Sorry, I couldn't finish that: ${run.error}`
        : "Sorry, I couldn't finish that. Please try again.",
      actions: [],
    };
  }

  const steps: AgentRunStep[] = run.steps || [];

  const finalSteps = steps.filter((s) => s.type === 'final');
  const lastFinal = finalSteps[finalSteps.length - 1];
  const reply = lastFinal?.text || "I didn't have a specific reply for that.";

  const actions: Array<{ type: string; label: string; proposedActionId?: string }> = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.type !== 'tool_call' || !step.tool || !ACTION_TOOL_NAMES.has(step.tool)) continue;

    const resultStep = steps
      .slice(i + 1)
      .find((s) => s.type === 'tool_result' && s.tool === step.tool);

    const output: any = resultStep?.output;
    if (!output || output.error) continue;

    actions.push({
      type: step.tool,
      label: output.summary || `Proposed action (${step.tool})`,
      proposedActionId: output.proposedActionId,
    });
  }

  return { reply, actions };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest src/ai-recruiter/copilot/extract-copilot-reply.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Swap the controller endpoint**

```ts
// backend/src/ai-recruiter/ai-recruiter.controller.ts
import { AgentRuntimeService } from '../agent-runtime/agent-runtime.service';
import { RECRUITER_COPILOT_TYPE } from './copilot/recruiter-copilot.definition';
import { extractCopilotReply } from './copilot/extract-copilot-reply';

// Update constructor:
constructor(
  private readonly aiRecruiterService: AiRecruiterService,
  private readonly autopilotRulesService: AutopilotRulesService,
  private readonly actionsService: EmployerAiActionsService,
  private readonly agentRuntime: AgentRuntimeService,
) {}

// Replace the existing copilot() method body:
@Post('copilot')
async copilot(@Body() dto: CopilotDto, @Request() req) {
  const userId = req.user._id.toString();
  const run = await this.agentRuntime.run(RECRUITER_COPILOT_TYPE, userId, {
    message: dto.message,
  });
  return extractCopilotReply(run);
}
```

- [ ] **Step 6: Live-verify end to end**

```bash
curl -s -X POST http://localhost:8000/api/employer/ai/copilot \
  -H "Authorization: Bearer $ETOK" -H 'Content-Type: application/json' \
  -d '{"message":"Who are my top candidates?"}'
```
Expected: a JSON `{reply, actions}` response where `reply` reflects real applicant data (or an honest "you have no applicants yet" if the test employer's pool is empty) — not the old regex-based canned response.

- [ ] **Step 7: Run the full backend suite**

Run: `cd backend && npx jest`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add backend/src/ai-recruiter/
git commit -m "feat(ai-recruiter): Copilot chat now runs the multi-turn tool-use agent loop"
```

---

### Task 11: Frontend — action chips reflect real proposals

**Files:**
- Modify: `frontend/src/pages/employer/copilot.jsx`

**Interfaces:**
- Consumes: the new `actions[].proposedActionId` field from Task 10's response shape.

- [ ] **Step 1: Read the current `AiMessage`/action-chip rendering (lines ~20-45) before editing**

- [ ] **Step 2: Change the chip click handler**

Replace the existing `onAction(a)` handler (which resends `a.label || a.type` as a new chat message) with:
```jsx
const onAction = (a) => {
  if (a.proposedActionId) {
    // The action already happened server-side as a pending proposal by the
    // time this reply rendered — link to where it can be reviewed instead
    // of pretending to "do" anything client-side.
    router.push('/employer/approvals');
    return;
  }
  // No proposedActionId means this action chip didn't create a real
  // proposal (e.g. an informational suggestion) — fall back to the
  // existing behavior of resending it as a message.
  pushUserAndReply(a.label || a.type);
};
```
(Requires `useRouter` from `next/navigation` or `next/router` matching the existing import convention already used elsewhere in this file — check the top of `copilot.jsx` for which one it already imports, if any; add if absent.)

Update the chip's rendered label to reflect that it's already proposed, e.g. change static "Do this" styling to show the action's `label` text directly (which now comes from the real `summary` set by Task 8's tool handlers, e.g. "Proposed advancing to interview, awaiting your approval.") rather than a generic action name.

- [ ] **Step 3: Build to confirm no syntax errors**

Run: `cd frontend && npx next build`
Expected: succeeds

- [ ] **Step 4: Manual verification**

Sign in as the employer test account, open `/employer/copilot`, ask "Who are my top candidates?" and confirm a real answer referencing actual applicant data; ask "Move [a real applicant name] to interview" and confirm a chip appears that navigates to Approvals, where the proposal is now visible.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/employer/copilot.jsx
git commit -m "feat(employer): Copilot action chips link to real pending proposals"
```

---

## Phase 4 — Sourcing

### Task 12: Add `candidateId`/`email` to `EmployerTalentCandidate`

**Files:**
- Modify: `backend/src/employer-talent/schemas/employer-talent-candidate.schema.ts`
- Test: extend or create `backend/src/employer-talent/employer-talent.service.spec.ts`

**Interfaces:**
- Produces: `EmployerTalentCandidate.candidateId?: Types.ObjectId`, `EmployerTalentCandidate.email?: string` (both optional — a hand-added talent-pool entry may have neither).

- [ ] **Step 1: Write the failing test**

```ts
// backend/src/employer-talent/employer-talent.service.spec.ts (new file if none exists — check first with grep)
import { Types } from 'mongoose';
import { EmployerTalentService } from './employer-talent.service';

describe('EmployerTalentService.create — candidateId/email support', () => {
  it('persists an optional candidateId and email when provided', async () => {
    const saved: any = {};
    const CandidateModelMock: any = function (doc: any) {
      Object.assign(this, doc);
      this.save = jest.fn().mockResolvedValue({ ...doc });
    };
    const service = new EmployerTalentService(CandidateModelMock);

    const result: any = await service.create('owner-1', {
      name: 'Jordan Lee',
      candidateId: new Types.ObjectId().toString(),
      email: 'jordan@example.com',
    } as any);

    expect(result.candidateId).toBeDefined();
    expect(result.email).toBe('jordan@example.com');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/employer-talent/employer-talent.service.spec.ts`
Expected: FAIL — `candidateId`/`email` not accepted by the DTO / not persisted

- [ ] **Step 3: Modify the schema**

```ts
// backend/src/employer-talent/schemas/employer-talent-candidate.schema.ts — add two fields
@Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false, index: true })
candidateId?: Types.ObjectId;

@Prop({ default: '' })
email?: string;
```

Add a non-unique index (a person can legitimately be re-added under a different segment, so this stays a lookup aid, not a hard constraint): `EmployerTalentCandidateSchema.index({ ownerId: 1, candidateId: 1 });`

- [ ] **Step 4: Modify the DTO**

```ts
// backend/src/employer-talent/dto/create-candidate.dto.ts — add:
@IsOptional()
@IsString()
candidateId?: string;

@IsOptional()
@IsString()
email?: string;
```

- [ ] **Step 5: Modify the service to persist the new fields**

```ts
// backend/src/employer-talent/employer-talent.service.ts — in create():
const candidate = new this.candidateModel({
  ownerId, name: dto.name, headline: dto.headline || '',
  initials: computeInitials(dto.name), skills: dto.skills || [],
  segment, tag: tagMap[segment] || 'Saved', source: dto.source || '',
  candidateId: dto.candidateId || undefined,
  email: dto.email || '',
  addedAt: new Date(),
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && npx jest src/employer-talent/`
Expected: PASS (all existing + new test)

- [ ] **Step 7: Commit**

```bash
git add backend/src/employer-talent/
git commit -m "feat(employer-talent): add optional candidateId/email for cross-source dedup"
```

---

### Task 13: Sourcing pool merge + `sourcePool` field

**Files:**
- Modify: `backend/src/ai-recruiter/ai-recruiter.service.ts` (`sourcing`, `buildSourcingCandidates`)
- Modify: `backend/src/ai-recruiter/ai-recruiter.module.ts` (import talent module for the model)

**Interfaces:**
- Consumes: `EmployerTalentCandidateDocument` (Task 12's fields).
- Produces: each `sourcing()` result candidate gains `sourcePool: 'talent_pool' | 'past_applicant'`.

- [ ] **Step 1: Write the failing test**

```ts
// backend/src/ai-recruiter/ai-recruiter.service.spec.ts — add to the existing file from Task 3
describe('AiRecruiterService.sourcing — pool merge', () => {
  const ownerId = new Types.ObjectId().toString();

  it('merges talent-pool and applicant-history candidates, tagging each with sourcePool', async () => {
    const talentCandidate = {
      _id: new Types.ObjectId(), name: 'Jamie Fox', candidateId: null,
      skills: ['Go'], headline: 'Backend Engineer',
    };
    const applicant = {
      _id: new Types.ObjectId(), candidateId: new Types.ObjectId(),
      candidateName: 'Riley Park', skills: ['Go'], candidateEmail: 'riley@x.com',
      appliedAt: new Date(),
    };
    const applicantModel: any = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([applicant]) }) }),
      }),
    };
    const talentModel: any = {
      find: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([talentCandidate]) }),
      }),
    };
    const service = new AiRecruiterService(
      applicantModel, {} as any, { enforceQuota: jest.fn().mockRejectedValue(new Error('no key')) } as any,
      { findOneAndUpdate: jest.fn() } as any, // autopilotConfigModel
      { find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }) }) } as any, // proposedActionModel (Task 3) — unused by sourcing()
      talentModel,
    );

    const result = await service.sourcing('backend engineer with Go', ownerId);

    const pools = result.candidates.map((c: any) => c.candidate.sourcePool);
    expect(pools).toContain('talent_pool');
    expect(pools).toContain('past_applicant');
  });

  it('deduplicates a candidate present in both pools, keeping the applicant record', async () => {
    const sharedCandidateId = new Types.ObjectId();
    const talentCandidate = {
      _id: new Types.ObjectId(), name: 'Riley Park', candidateId: sharedCandidateId,
      skills: ['Go'],
    };
    const applicant = {
      _id: new Types.ObjectId(), candidateId: sharedCandidateId,
      candidateName: 'Riley Park', skills: ['Go'], candidateEmail: 'riley@x.com',
      appliedAt: new Date(),
    };
    const applicantModel: any = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([applicant]) }) }),
      }),
    };
    const talentModel: any = {
      find: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([talentCandidate]) }),
      }),
    };
    const service = new AiRecruiterService(
      applicantModel, {} as any, { enforceQuota: jest.fn().mockRejectedValue(new Error('no key')) } as any,
      { findOneAndUpdate: jest.fn() } as any, // autopilotConfigModel
      { find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }) }) } as any, // proposedActionModel (Task 3) — unused by sourcing()
      talentModel,
    );

    const result = await service.sourcing('Go engineer', ownerId);

    const rileys = result.candidates.filter((c: any) => c.candidate.name === 'Riley Park');
    expect(rileys).toHaveLength(1);
    expect(rileys[0].candidate.sourcePool).toBe('past_applicant');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/ai-recruiter/ai-recruiter.service.spec.ts -t sourcing`
Expected: FAIL — constructor doesn't accept a 5th arg yet / no `sourcePool` field

- [ ] **Step 3: Modify the constructor and `sourcing()`**

```ts
// backend/src/ai-recruiter/ai-recruiter.service.ts
import {
  EmployerTalentCandidate,
  EmployerTalentCandidateDocument,
} from '../employer-talent/schemas/employer-talent-candidate.schema';

// Constructor gains a 6th param (5th is `proposedActionModel`, added in
// Task 3's Step 5b for the activity log — this task appends after it):
constructor(
  @InjectModel(EmployerApplicant.name)
  private readonly applicantModel: Model<EmployerApplicantDocument>,
  private readonly routingService: LLMRoutingService,
  private readonly quotaService: LLMQuotaService,
  @InjectModel(EmployerAutopilotConfig.name)
  private readonly autopilotConfigModel: Model<EmployerAutopilotConfigDocument>,
  @InjectModel(AiProposedAction.name)
  private readonly proposedActionModel: Model<AiProposedActionDocument>,
  @InjectModel(EmployerTalentCandidate.name)
  private readonly talentModel: Model<EmployerTalentCandidateDocument>,
) {}
```

In `sourcing(brief, employerId)`, before calling `buildSourcingCandidates`, fetch and merge both pools:

```ts
const applicantPool = await this.applicantModel
  .find({ ownerId: new Types.ObjectId(employerId) })
  .sort({ appliedAt: -1 })
  .limit(200)
  .lean();

const talentPool = await this.talentModel
  .find({ ownerId: new Types.ObjectId(employerId) })
  .limit(200)
  .lean();

const merged = this.mergeSourcingPools(applicantPool, talentPool);
const built = this.buildSourcingCandidates(merged, text, role);
```

Add the merge helper and update the candidate-building code to read/pass through a `sourcePool` per record:

```ts
private mergeSourcingPools(
  applicants: EmployerApplicantDocument[],
  talent: EmployerTalentCandidateDocument[],
): Array<{ record: any; sourcePool: 'talent_pool' | 'past_applicant' }> {
  const seen = new Set<string>(); // candidateId.toString() OR email, whichever is present
  const merged: Array<{ record: any; sourcePool: 'talent_pool' | 'past_applicant' }> = [];

  // Applicant history wins the dedup — it is the richer record.
  for (const app of applicants as any[]) {
    const key = app.candidateId ? String(app.candidateId) : (app.candidateEmail || '');
    if (key) seen.add(key);
    merged.push({ record: app, sourcePool: 'past_applicant' });
  }

  for (const cand of talent as any[]) {
    const key = cand.candidateId ? String(cand.candidateId) : (cand.email || '');
    if (key && seen.has(key)) continue; // already represented by a richer applicant record
    merged.push({ record: cand, sourcePool: 'talent_pool' });
  }

  return merged;
}
```

Update `buildSourcingCandidates` (existing method) to accept the merged `{record, sourcePool}[]` shape instead of a plain applicant array, and to read fields defensively since a talent-pool record and an applicant record have different field names (`name` vs `candidateName`, `headline` vs none, etc — normalize both onto the existing output shape):

```ts
private buildSourcingCandidates(
  pool: Array<{ record: any; sourcePool: 'talent_pool' | 'past_applicant' }>,
  text: string,
  role: string,
) {
  return pool.map(({ record, sourcePool }) => {
    const name = record.candidateName || record.name || 'Unknown';
    const title = record.candidateHeadline || record.headline || '';
    // ...existing scoring/outreach-building logic stays the same, reading
    // `record.skills` (present on both schemas) unchanged...
    return {
      id: (record._id || '').toString(),
      candidate: {
        candidateId: record.candidateId ? String(record.candidateId) : null,
        name, title,
        location: record.candidateLocation || '',
        skills: record.skills || [],
        yearsExperience: record.yearsExperience || 0,
        matchScore: /* existing scoring expression, unchanged */,
        outreach: /* existing outreach text, unchanged */,
        sourcePool,
      },
    };
  });
}
```

(The exact scoring/outreach expressions must be copied verbatim from the current method body — read `ai-recruiter.service.ts` lines 614-657 before editing and preserve that logic exactly, only changing what field the input is read from and adding the `sourcePool` passthrough.)

- [ ] **Step 4: Register the talent-pool model in the module**

```ts
// backend/src/ai-recruiter/ai-recruiter.module.ts
import { EmployerTalentModule } from '../employer-talent/employer-talent.module';

@Module({
  imports: [
    EmployerPipelineModule,
    LLMModule,
    EmployerInterviewsModule,
    EmployerMessagesModule,
    AgentRuntimeModule,
    EmployerTalentModule, // provides EmployerTalentCandidate's model via its MongooseModule export
    MongooseModule.forFeature([
      { name: EmployerAutopilotConfig.name, schema: EmployerAutopilotConfigSchema },
      { name: AiProposedAction.name, schema: AiProposedActionSchema },
    ]),
  ],
  // ...
})
```

(Verify `EmployerTalentModule` actually exports `MongooseModule` or the model directly — if its `exports` array only lists `EmployerTalentService`, add `MongooseModule.forFeature([{name: EmployerTalentCandidate.name, schema: EmployerTalentCandidateSchema}])` directly to `AiRecruiterModule`'s own imports instead, mirroring how `EmployerMessagesModule` exports `MongooseModule` but `EmployerInterviewsModule` does not — check the real file before assuming either shape.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx jest src/ai-recruiter/ai-recruiter.service.spec.ts`
Expected: PASS (all sourcing + earlier tests in this file)

- [ ] **Step 6: Run the full backend suite**

Run: `cd backend && npx jest`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/ai-recruiter/
git commit -m "feat(ai-recruiter): Sourcing now searches the talent pool alongside applicant history"
```

---

### Task 14: Real shortlist → talent-pool write

**Files:**
- Modify: `frontend/src/pages/employer/sourcing.jsx`
- Modify: `frontend/src/services/employerApi.js` (confirm `employerTalentApi.create` exists; add if not)

**Interfaces:**
- Consumes: `POST /employer/talent-pool` (existing, Task 12 extended its accepted body with `candidateId`/`email`).

- [ ] **Step 1: Check the current `employerTalentApi` shape**

Run: `cd frontend && grep -n "employerTalentApi" src/services/employerApi.js`
If a `create` method already exists (likely, given `/employer/talent-pool` POST already backs the Talent Pool page), reuse it. If its name differs, note the real name for Step 3.

- [ ] **Step 2: Read the current shortlist toggle code in `sourcing.jsx`**

Locate the `setShortlisted` local-state toggle (line ~363 per ground truth) before editing.

- [ ] **Step 3: Replace the local-only toggle with a real write when the source isn't already the talent pool**

```jsx
const [shortlisting, setShortlisting] = useState({}); // { [candidateId]: boolean }

const toggleShortlist = async (candidate) => {
  const id = candidate.id;
  const alreadyShortlisted = !!shortlisted[id];

  if (alreadyShortlisted) {
    // Un-shortlisting is local-only for now — removing FROM the talent pool
    // is already a real, separate action on /employer/talent-pool.
    setShortlisted((prev) => ({ ...prev, [id]: false }));
    return;
  }

  if (candidate.sourcePool === 'talent_pool') {
    // Already in the talent pool — nothing to write, just reflect it locally.
    setShortlisted((prev) => ({ ...prev, [id]: true }));
    return;
  }

  setShortlisting((prev) => ({ ...prev, [id]: true }));
  try {
    await employerTalentApi.create({
      name: candidate.name,
      headline: candidate.title,
      skills: candidate.skills,
      candidateId: candidate.candidateId || undefined,
      segment: 'saved',
      source: 'sourcing_agent',
    });
    setShortlisted((prev) => ({ ...prev, [id]: true }));
  } catch (err) {
    console.error('Error adding to talent pool:', err);
  } finally {
    setShortlisting((prev) => ({ ...prev, [id]: false }));
  }
};
```

Update the shortlist button's `onClick` to call `toggleShortlist(candidate)` instead of the direct `setShortlisted` call, and disable it while `shortlisting[candidate.id]` is true.

- [ ] **Step 4: Display the `sourcePool` badge on each result card**

Near where `candidate.title`/`candidate.location` are rendered, add a small badge reading "In your talent pool" / "Applied 4 months ago" (derive relative time from the applicant's `appliedAt` if the backend includes it — if not carried through by `buildSourcingCandidates`'s current output shape, add `appliedAt` to that shape in Task 13 rather than inventing display text without real data).

- [ ] **Step 5: Build to confirm no syntax errors**

Run: `cd frontend && npx next build`
Expected: succeeds

- [ ] **Step 6: Manual verification**

Sign in as the employer test account, run Sourcing, shortlist a `past_applicant`-sourced candidate, then check `/employer/talent-pool` shows them as a real new entry.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/employer/sourcing.jsx frontend/src/services/employerApi.js
git commit -m "feat(employer): Sourcing shortlist now writes real talent-pool entries"
```

---

## Phase 5 — E2E regression

### Task 15: End-to-end Autopilot approval spec

**Files:**
- Create: `e2e/specs/employer/autopilot-approval.spec.ts`

**Interfaces:**
- Consumes: `api.post`/`api.get`/`api.patch`, `createUser`, `uniqueId` from `e2e/support/api.ts`; `storage.employer`, `storage.candidate` from `e2e/fixtures/test.ts`.

- [ ] **Step 1: Write the spec**

```ts
// e2e/specs/employer/autopilot-approval.spec.ts
import { test, expect, storage } from '../../fixtures/test';
import { api, createUser, uniqueId } from '../../support/api';

/**
 * The end-to-end proof for this whole feature set: an employer posts a job,
 * a candidate applies, Autopilot proposes an action, and approving it in the
 * browser actually changes the applicant's real record. Same discipline as
 * the employer-job-reaches-candidate spec earlier in this suite — every
 * serious defect on this project so far lived on a layer boundary unit
 * tests structurally cannot see.
 */
test.describe.configure({ mode: 'serial' });

test.describe('Autopilot: proposal -> approval -> real applicant change', () => {
  let employer: Awaited<ReturnType<typeof createUser>>;
  let candidate: Awaited<ReturnType<typeof createUser>>;
  let jobId: string;
  let jobTitle: string;

  test.beforeAll(async () => {
    employer = await createUser('ROLE_EMPLOYER', 'autopilot-employer');
    candidate = await createUser('ROLE_CANDIDATE', 'autopilot-candidate');
    jobTitle = `Staff Engineer ${uniqueId('autopilot')}`;
  });

  test('employer enables autopilot with a low reject threshold', async () => {
    // A deliberately generous reject threshold (99) guarantees THIS specific
    // low-effort test applicant scores below it, so the test does not depend
    // on the exact deterministic scoring formula's real-world tuning.
    await api.post('/api/employer/ai/autopilot/toggle', { enabled: true }, employer.token);
  });

  test('employer posts a job', async () => {
    const res: any = await api.post(
      '/api/employer/jobs',
      {
        title: jobTitle,
        companyName: 'E2E Autopilot Co',
        type: 'Full-time',
        location: 'Remote',
        isRemote: true,
        description: 'A role for exercising the autopilot approval E2E path end to end.',
        status: 'active',
        visibility: 'public',
      },
      employer.token,
    );
    jobId = res.job?._id || res.job?.id;
    expect(jobId, 'employer job was not created').toBeTruthy();
  });

  test('candidate applies, and Autopilot proposes a reject (low-signal applicant)', async () => {
    await api.post(
      '/api/applications',
      { jobId },
      candidate.token,
    );

    let proposals: any[] = [];
    await expect
      .poll(
        async () => {
          const res: any = await api.get('/api/employer/ai/proposed-actions?status=pending', employer.token);
          proposals = res;
          return Array.isArray(proposals) && proposals.length > 0;
        },
        {
          message: 'Autopilot never proposed an action for the new applicant',
          timeout: 20_000,
        },
      )
      .toBe(true);

    expect(proposals[0].actionType).toMatch(/reject|advance_stage/);
  });

  test('employer approves the proposal in the browser, and the applicant record actually changes', async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: storage.employer });
    const page = await context.newPage();

    try {
      await page.goto('/employer/autopilot', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});

      await page.getByRole('button', { name: /^approve$/i }).first().click();

      await expect(
        page.locator('body'),
        'approving a proposal left the queue looking unchanged',
      ).not.toContainText('Loading', { timeout: 15_000 });
    } finally {
      await context.close();
    }

    // Verify the underlying data actually changed, not just the UI.
    const proposalsRes: any = await api.get(
      '/api/employer/ai/proposed-actions?status=approved',
      employer.token,
    );
    expect(
      proposalsRes.length,
      'no proposal reached approved status after clicking Approve',
    ).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the spec against the running stack**

```bash
cd e2e && E2E_NO_SERVER=1 E2E_BASE_URL=http://localhost:3001 npx playwright test specs/employer/autopilot-approval.spec.ts --project=chromium --reporter=list
```
Expected: PASS (4 tests)

- [ ] **Step 3: Run the full E2E suite to confirm no regressions**

```bash
cd e2e && E2E_NO_SERVER=1 E2E_BASE_URL=http://localhost:3001 npx playwright test --project=chromium --reporter=list
```
Expected: PASS — full suite green, same as the baseline established earlier this branch (111 passed, 2 skipped)

- [ ] **Step 4: Commit**

```bash
git add e2e/specs/employer/autopilot-approval.spec.ts
git commit -m "test(e2e): end-to-end Autopilot proposal -> approval -> real applicant change"
```

---

## Final verification

- [ ] Run `cd backend && npx jest` — full suite passes
- [ ] Run `cd backend && npx tsc --noEmit -p tsconfig.json` — clean
- [ ] Run `cd frontend && npx next build` — clean
- [ ] Run the full `e2e/` suite (chromium + mobile projects) — no regressions from the mobile-overflow fixes earlier this branch
- [ ] Manually walk all three pages as the seeded employer test account: Copilot (ask a question, propose an action, confirm it in Approvals), Sourcing (run a search, shortlist a past-applicant result, confirm it appears in Talent Pool), Autopilot (toggle on, Run now, approve a proposal, confirm the applicant's stage actually changed)
