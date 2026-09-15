import { Injectable } from '@nestjs/common';
import { ResumeMatcherAdapter } from '../ats/resume-matcher.adapter';
import {
  EmployerAtsRuntimeService,
  PreparedEmployerAtsRun,
} from './employer-ats-runtime.service';

export type AtsAssessmentStatus =
  | 'NOT_RUN'
  | 'RUNNING'
  | 'COMPLETE'
  | 'BUDGET_EXHAUSTED'
  | 'CONFIGURATION_ERROR'
  | 'ATS_FAILED';

export interface EmployerAtsAssessmentInput {
  ownerId: string;
  runId: string;
  applicationId: string;
  resumeArtifactId: string;
  resumeVersion: number;
  resumeHash: string;
  resumeContent: string;
  jobId: string;
  jobDescription: string;
  jobDescriptionHash: string;
}

export interface EmployerAtsAssessmentResult {
  status: AtsAssessmentStatus;
  reason?: string;
  semanticMatch?: number;
  subScores?: Record<string, number>;
  gaps?: string[];
  suggestions?: string[];
  modelAlias?: string;
  effort?: string;
  harness?: 'ats';
  sourceRunId?: string;
  costUsd?: number;
  requestIds?: string[];
  limitUsd?: number;
  spentUsd?: number;
  remainingUsd?: number;
  period?: 'monthly';
  resetAt?: Date;
}

/** Employer-only ATS boundary. Implementations must not borrow candidate runtime state. */
export abstract class EmployerAtsAssessmentGateway {
  abstract assess(
    input: EmployerAtsAssessmentInput,
  ): Promise<EmployerAtsAssessmentResult>;
}

export class EmployerAtsUnavailableGateway
  implements EmployerAtsAssessmentGateway
{
  async assess(): Promise<EmployerAtsAssessmentResult> {
    return {
      status: 'NOT_RUN',
      reason: 'EMPLOYER_ATS_GATEWAY_PENDING_JOB_103',
      harness: 'ats',
    };
  }
}

@Injectable()
export class EmployerAtsGateway implements EmployerAtsAssessmentGateway {
  constructor(
    private readonly runtime: EmployerAtsRuntimeService,
    private readonly matcher: ResumeMatcherAdapter,
  ) {}

  async assess(
    input: EmployerAtsAssessmentInput,
  ): Promise<EmployerAtsAssessmentResult> {
    let prepared;
    try {
      prepared = await this.runtime.prepare(input.ownerId, input.runId);
    } catch {
      return {
        status: 'CONFIGURATION_ERROR',
        reason: 'EMPLOYER_ATS_CONFIGURATION_ERROR',
        harness: 'ats',
        sourceRunId: input.runId,
      };
    }
    if (prepared.status !== 'READY') {
      return {
        ...prepared,
        status:
          prepared.status === 'RUNNING'
            ? 'NOT_RUN'
            : prepared.status,
        harness: 'ats',
        sourceRunId: input.runId,
      };
    }

    const run = prepared as PreparedEmployerAtsRun;
    let result;
    try {
      result = await this.matcher.analyze({
        sandboxId: run.sandboxId,
        latex: input.resumeContent,
        jobDescription: input.jobDescription,
        sourceRevision: input.resumeVersion,
        alias: run.alias,
      });
    } catch {
      let usage = { costUsd: 0, requestIds: [] as string[] };
      try {
        usage = await this.runtime.finish(run, { succeeded: false });
      } catch {
        // The runtime releases its lock in finally; do not make a second charge attempt.
      }
      return {
        status: 'ATS_FAILED',
        reason: 'EMPLOYER_ATS_EXECUTION_FAILED',
        modelAlias: run.alias,
        effort: run.effort,
        harness: 'ats',
        sourceRunId: input.runId,
        ...usage,
      };
    }

    let usage;
    try {
      usage = await this.runtime.finish(run, { succeeded: true });
    } catch {
      return {
        status: 'ATS_FAILED',
        reason: 'EMPLOYER_ATS_ACCOUNTING_FAILED',
        modelAlias: run.alias,
        effort: run.effort,
        harness: 'ats',
        sourceRunId: input.runId,
      };
    }
    return {
      status: 'COMPLETE',
      semanticMatch: result.semanticMatch,
      subScores: result.subScores,
      gaps: result.keywordGaps,
      suggestions: result.suggestions,
      modelAlias: run.alias,
      effort: run.effort,
      harness: 'ats',
      sourceRunId: input.runId,
      ...usage,
    };
  }
}
