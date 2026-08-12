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
    await this.evaluateAndReport(ownerId, applicant);
  }

  /**
   * Same evaluation as `evaluateApplicant`, but reports whether a new
   * proposal was actually created — used by `sweepAll` to tally counts
   * without a second, redundant query against the proposed-actions store.
   */
  private async evaluateAndReport(
    ownerId: string,
    applicant: EmployerApplicantDocument,
  ): Promise<boolean> {
    try {
      const config = await this.aiRecruiterService.getOrCreateAutopilotConfig(ownerId);
      if (!config.enabled) return false;

      const score = this.aiRecruiterService.scoreApplicant(applicant);
      const applicantId = applicant._id.toString();

      const rejectRule = config.rules.find(
        (r) => r.type === 'auto_propose_reject' && r.enabled,
      );
      if (rejectRule && score < rejectRule.scoreThreshold) {
        if (await this.actionsService.existsFor(applicantId, 'reject', 'autopilot')) {
          return false;
        }
        await this.actionsService.create({
          ownerId,
          source: 'autopilot',
          actionType: 'reject',
          applicantId,
          jobId: applicant.jobId ? String(applicant.jobId) : undefined,
          payload: {},
          rationale: this.aiRecruiterService.rationaleFor(applicant, score),
        });
        return true;
      }

      const advanceRule = config.rules.find(
        (r) => r.type === 'auto_propose_advance' && r.enabled,
      );
      if (advanceRule && score > advanceRule.scoreThreshold) {
        if (await this.actionsService.existsFor(applicantId, 'advance_stage', 'autopilot')) {
          return false;
        }
        await this.actionsService.create({
          ownerId,
          source: 'autopilot',
          actionType: 'advance_stage',
          applicantId,
          jobId: applicant.jobId ? String(applicant.jobId) : undefined,
          payload: { targetStage: 'screening' },
          rationale: this.aiRecruiterService.rationaleFor(applicant, score),
        });
        return true;
      }

      return false;
    } catch {
      // Autopilot evaluation must never break the caller (applicant
      // creation, or a manual sweep). Silently skip this applicant.
      return false;
    }
  }

  async sweepAll(ownerId: string): Promise<{ evaluated: number; proposed: number }> {
    const applicants = await this.applicantModel
      .find({ ownerId: new Types.ObjectId(ownerId) })
      .lean();

    let proposed = 0;
    for (const applicant of applicants) {
      const didPropose = await this.evaluateAndReport(ownerId, applicant as any);
      if (didPropose) proposed++;
    }

    return { evaluated: applicants.length, proposed };
  }
}
