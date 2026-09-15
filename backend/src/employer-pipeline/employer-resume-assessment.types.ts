import { AiContentHeuristicResult } from './resume-ai-content-heuristic.service';
import { EmployerAtsAssessmentResult } from './employer-ats-assessment.gateway';

export type ResumeAssessmentStatus =
  | 'NOT_RUN'
  | 'RUNNING'
  | 'COMPLETE'
  | 'PARTIAL'
  | 'STALE'
  | 'NO_RESUME'
  | 'NO_JOB_DESCRIPTION'
  | 'BUDGET_EXHAUSTED'
  | 'CONFIGURATION_ERROR'
  | 'ATS_FAILED'
  | 'DETECTOR_FAILED';

export interface PersistedResumeAssessment {
  status: ResumeAssessmentStatus;
  reason?: string;
  runId: string;
  pairKey?: string;
  applicationId?: string;
  submittedResume?: {
    artifactId: string;
    version: number;
    hash: string;
  };
  job?: {
    jobId: string;
    descriptionHash: string;
    descriptionVersion: number;
  };
  checkedAt?: Date;
  staleAt?: Date;
  staleReason?: string;
  actor: {
    ownerId: string;
    ownerType: 'employer';
  };
  ats: EmployerAtsAssessmentResult;
  aiContent: ({ status: 'COMPLETE' } & AiContentHeuristicResult) | {
    status: 'NOT_RUN' | 'RUNNING' | 'DETECTOR_FAILED';
    reason?: string;
  };
}
