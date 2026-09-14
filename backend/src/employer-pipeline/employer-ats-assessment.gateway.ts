export type AtsAssessmentStatus =
  | 'NOT_RUN'
  | 'RUNNING'
  | 'COMPLETE'
  | 'BUDGET_EXHAUSTED'
  | 'ATS_FAILED';

export interface EmployerAtsAssessmentInput {
  ownerId: string;
  applicationId: string;
  resumeArtifactId: string;
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
}

/**
 * JOB-103 replaces this implementation with the employer-owned budget/key and
 * persistent-sandbox route. Keeping the default unavailable prevents JOB-102
 * from ever borrowing the candidate's resume sandbox or credential.
 */
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
