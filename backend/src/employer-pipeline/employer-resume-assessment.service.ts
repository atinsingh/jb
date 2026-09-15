import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomUUID } from 'crypto';
import { Model, Types } from 'mongoose';
import {
  ApplicationArtifact,
  ApplicationArtifactDocument,
  ArtifactType,
} from '../schemas/application-artifact.schema';
import {
  EmployerJob,
  EmployerJobDocument,
} from '../employer-jobs/schemas/employer-job.schema';
import {
  EmployerApplicant,
  EmployerApplicantDocument,
} from './schemas/employer-applicant.schema';
import { ResumeAiContentHeuristicService } from './resume-ai-content-heuristic.service';
import { EmployerAtsAssessmentGateway } from './employer-ats-assessment.gateway';
import {
  PersistedResumeAssessment,
  ResumeAssessmentStatus,
} from './employer-resume-assessment.types';
import { EmployerAtsRuntimeService } from './employer-ats-runtime.service';

@Injectable()
export class EmployerResumeAssessmentService {
  constructor(
    @InjectModel(EmployerApplicant.name)
    private readonly applicantModel: Model<EmployerApplicantDocument>,
    @InjectModel(ApplicationArtifact.name)
    private readonly artifactModel: Model<ApplicationArtifactDocument>,
    @InjectModel(EmployerJob.name)
    private readonly employerJobModel: Model<EmployerJobDocument>,
    private readonly heuristic: ResumeAiContentHeuristicService,
    private readonly atsGateway: EmployerAtsAssessmentGateway,
    private readonly atsRuntime?: EmployerAtsRuntimeService,
  ) {}

  async budgetStatus(ownerId: string) {
    return this.atsRuntime?.budgetStatus(ownerId) || {
      status: 'CONFIGURATION_ERROR',
      reason: 'EMPLOYER_ATS_CONFIGURATION_ERROR',
    };
  }

  async assess(
    ownerIdValue: string,
    applicantIdValue: string,
  ): Promise<PersistedResumeAssessment> {
    const ownerId = this.asObjectId(ownerIdValue);
    const applicantId = this.asObjectId(applicantIdValue);
    const applicant: any = await this.applicantModel
      .findOne({ _id: applicantId, ownerId })
      .lean()
      .exec();
    if (!applicant) throw new NotFoundException('Applicant not found');

    const runId = randomUUID();
    const base = {
      runId,
      actor: { ownerId: String(ownerIdValue), ownerType: 'employer' as const },
    };
    const submittedResume = applicant.submittedResume;
    if (!applicant.applicationId || !submittedResume?.artifactId) {
      return this.persistTerminalInputState(
        applicantId,
        ownerId,
        {
          ...base,
          status: 'NO_RESUME',
          reason: 'EXACT_SUBMITTED_RESUME_REQUIRED',
          applicationId: applicant.applicationId
            ? String(applicant.applicationId)
            : undefined,
          ats: { status: 'NOT_RUN', reason: 'NO_RESUME', harness: 'ats' },
          aiContent: { status: 'NOT_RUN', reason: 'NO_RESUME' },
        },
      );
    }

    const artifact: any = await this.artifactModel
      .findOne({
        _id: this.asObjectId(submittedResume.artifactId),
        applicationId: this.asObjectId(applicant.applicationId),
        type: ArtifactType.RESUME_VERSION,
      })
      .lean()
      .exec();
    if (!artifact) {
      return this.persistTerminalInputState(applicantId, ownerId, {
        ...base,
        status: 'NO_RESUME',
        reason: 'SUBMITTED_RESUME_ARTIFACT_NOT_FOUND',
        applicationId: String(applicant.applicationId),
        ats: { status: 'NOT_RUN', reason: 'NO_RESUME', harness: 'ats' },
        aiContent: { status: 'NOT_RUN', reason: 'NO_RESUME' },
      });
    }
    if (
      artifact.version !== submittedResume.version ||
      artifact.metadata?.sha256 !== submittedResume.hash
    ) {
      return this.persistTerminalInputState(applicantId, ownerId, {
        ...base,
        status: 'NO_RESUME',
        reason: 'SUBMITTED_RESUME_ARTIFACT_MISMATCH',
        applicationId: String(applicant.applicationId),
        ats: { status: 'NOT_RUN', reason: 'NO_RESUME', harness: 'ats' },
        aiContent: { status: 'NOT_RUN', reason: 'NO_RESUME' },
      });
    }

    const job: any = await this.employerJobModel
      .findOne({ _id: this.asObjectId(applicant.jobId), ownerId })
      .lean()
      .exec();
    const jobDescription = this.normalizeJobDescription(job);
    if (!jobDescription) {
      return this.persistTerminalInputState(applicantId, ownerId, {
        ...base,
        status: 'NO_JOB_DESCRIPTION',
        reason: 'EMPLOYER_JOB_DESCRIPTION_REQUIRED',
        applicationId: String(applicant.applicationId),
        submittedResume: {
          artifactId: String(submittedResume.artifactId),
          version: submittedResume.version,
          hash: submittedResume.hash,
        },
        ats: {
          status: 'NOT_RUN',
          reason: 'NO_JOB_DESCRIPTION',
          harness: 'ats',
        },
        aiContent: { status: 'NOT_RUN', reason: 'NO_JOB_DESCRIPTION' },
      });
    }

    const descriptionHash = this.sha256(jobDescription);
    const pairKey = this.sha256(`${submittedResume.hash}:${descriptionHash}`);
    if (
      applicant.resumeAssessment?.status === 'RUNNING' &&
      applicant.resumeAssessment?.pairKey === pairKey
    ) {
      return applicant.resumeAssessment;
    }
    const applicationId = String(applicant.applicationId);
    const snapshot = {
      applicationId,
      submittedResume: {
        artifactId: String(submittedResume.artifactId),
        version: submittedResume.version,
        hash: submittedResume.hash,
      },
      job: {
        jobId: String(job._id),
        descriptionHash,
        descriptionVersion: 1,
      },
    };
    const running: PersistedResumeAssessment = {
      ...base,
      ...snapshot,
      pairKey,
      status: 'RUNNING',
      ats: { status: 'RUNNING', harness: 'ats' },
      aiContent: { status: 'RUNNING' },
    };
    const startUpdate: Record<string, unknown> = {
      $set: { resumeAssessment: running },
    };
    if (
      applicant.resumeAssessment?.pairKey &&
      applicant.resumeAssessment.pairKey !== pairKey
    ) {
      startUpdate.$push = {
        resumeAssessmentHistory: {
          ...applicant.resumeAssessment,
          status: 'STALE',
          staleAt: new Date(),
          staleReason: 'ASSESSED_PAIR_CHANGED',
        },
      };
    }
    const start: any = await this.applicantModel
      .updateOne(
        {
          _id: applicantId,
          ownerId,
          $or: [
            { 'resumeAssessment.status': { $ne: 'RUNNING' } },
            { 'resumeAssessment.pairKey': { $ne: pairKey } },
          ],
        },
        startUpdate,
      )
      .exec();
    if (start?.modifiedCount === 0) {
      const latest: any = await this.applicantModel
        .findOne({ _id: applicantId, ownerId })
        .lean()
        .exec();
      if (latest?.resumeAssessment) return latest.resumeAssessment;
      throw new NotFoundException('Applicant not found');
    }

    const resumeText = this.artifactText(artifact.content);
    let aiContent: PersistedResumeAssessment['aiContent'];
    try {
      aiContent = { status: 'COMPLETE', ...this.heuristic.analyze(resumeText) };
    } catch {
      aiContent = {
        status: 'DETECTOR_FAILED',
        reason: 'LOCAL_HEURISTIC_EXECUTION_FAILED',
      };
    }

    let ats: PersistedResumeAssessment['ats'];
    try {
      ats = await this.atsGateway.assess({
        ownerId: ownerIdValue,
        runId,
        applicationId,
        resumeArtifactId: String(submittedResume.artifactId),
        resumeVersion: submittedResume.version,
        resumeHash: submittedResume.hash,
        resumeContent: resumeText,
        jobId: String(job._id),
        jobDescription,
        jobDescriptionHash: descriptionHash,
      });
    } catch {
      ats = {
        status: 'ATS_FAILED',
        reason: 'EMPLOYER_ATS_EXECUTION_FAILED',
        harness: 'ats',
      };
    }

    const completed: PersistedResumeAssessment = {
      ...base,
      ...snapshot,
      pairKey,
      checkedAt: new Date(),
      status: this.combinedStatus(ats.status, aiContent.status),
      ats,
      aiContent,
    };
    const write: any = await this.applicantModel
      .updateOne(
        {
          _id: applicantId,
          ownerId,
          'resumeAssessment.runId': runId,
          'resumeAssessment.pairKey': pairKey,
        },
        { $set: { resumeAssessment: completed } },
      )
      .exec();
    if (write?.modifiedCount === 0) {
      const latest: any = await this.applicantModel
        .findOne({ _id: applicantId, ownerId })
        .lean()
        .exec();
      return latest?.resumeAssessment || completed;
    }
    return completed;
  }

  async markStaleIfNeeded(
    ownerIdValue: string,
    applicant: EmployerApplicantDocument,
  ): Promise<EmployerApplicantDocument> {
    const assessment: any = (applicant as any)?.resumeAssessment;
    if (!assessment || ['NOT_RUN', 'RUNNING', 'STALE'].includes(assessment.status)) {
      return applicant;
    }

    const currentResumeHash = (applicant as any)?.submittedResume?.hash;
    let staleReason =
      currentResumeHash &&
      assessment.submittedResume?.hash &&
      currentResumeHash !== assessment.submittedResume.hash
        ? 'SUBMITTED_RESUME_CHANGED'
        : '';
    if (!staleReason && assessment.job?.descriptionHash) {
      const ownerId = this.asObjectId(ownerIdValue);
      const job: any = await this.employerJobModel
        .findOne({ _id: this.asObjectId((applicant as any).jobId), ownerId })
        .lean()
        .exec();
      const currentDescription = this.normalizeJobDescription(job);
      const currentHash = currentDescription ? this.sha256(currentDescription) : '';
      if (currentHash !== assessment.job.descriptionHash) {
        staleReason = 'JOB_DESCRIPTION_CHANGED';
      }
    }
    if (!staleReason) return applicant;

    const staleAssessment = {
      ...assessment,
      status: 'STALE',
      staleAt: new Date(),
      staleReason,
    };
    await this.applicantModel
      .updateOne(
        {
          _id: (applicant as any)._id,
          ownerId: this.asObjectId(ownerIdValue),
        },
        { $set: { resumeAssessment: staleAssessment } },
      )
      .exec();
    (applicant as any).resumeAssessment = staleAssessment;
    return applicant;
  }

  private async persistTerminalInputState(
    applicantId: Types.ObjectId | string,
    ownerId: Types.ObjectId | string,
    assessment: PersistedResumeAssessment,
  ): Promise<PersistedResumeAssessment> {
    await this.applicantModel
      .updateOne(
        { _id: applicantId, ownerId },
        { $set: { resumeAssessment: assessment } },
      )
      .exec();
    return assessment;
  }

  private normalizeJobDescription(job: any): string {
    if (!job) return '';
    const sections: string[] = [];
    if (job.description) sections.push(String(job.description));
    for (const [label, values] of [
      ['Responsibilities', job.responsibilities],
      ['Requirements', job.requirements],
      ['Skills', job.skills],
    ] as const) {
      const cleaned = Array.isArray(values)
        ? values.map((value) => String(value).trim()).filter(Boolean)
        : [];
      if (cleaned.length) sections.push(`${label}:`, ...cleaned);
    }
    return sections
      .flatMap((section) => section.split(/\r?\n/))
      .map((line) => line.trim().replace(/\s+/g, ' '))
      .filter(Boolean)
      .join('\n');
  }

  private artifactText(content: string): string {
    try {
      const values: string[] = [];
      const visit = (value: unknown) => {
        if (typeof value === 'string' || typeof value === 'number') {
          values.push(String(value));
        } else if (Array.isArray(value)) {
          value.forEach(visit);
        } else if (value && typeof value === 'object') {
          Object.values(value).forEach(visit);
        }
      };
      visit(JSON.parse(content));
      return values.join('\n');
    } catch {
      return String(content || '');
    }
  }

  private combinedStatus(
    atsStatus: string,
    aiStatus: string,
  ): ResumeAssessmentStatus {
    if (atsStatus === 'COMPLETE' && aiStatus === 'COMPLETE') return 'COMPLETE';
    if (atsStatus === 'COMPLETE' || aiStatus === 'COMPLETE') return 'PARTIAL';
    if (aiStatus === 'DETECTOR_FAILED') return 'DETECTOR_FAILED';
    if (atsStatus === 'BUDGET_EXHAUSTED') return 'BUDGET_EXHAUSTED';
    if (atsStatus === 'CONFIGURATION_ERROR') return 'CONFIGURATION_ERROR';
    if (atsStatus === 'ATS_FAILED') return 'ATS_FAILED';
    return 'NOT_RUN';
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }

  private asObjectId(value: unknown): Types.ObjectId | string {
    try {
      return new Types.ObjectId(String(value));
    } catch {
      return String(value);
    }
  }
}
