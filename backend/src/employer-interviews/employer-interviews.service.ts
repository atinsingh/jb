import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  EmployerInterview,
  EmployerInterviewDocument,
} from './schemas/employer-interview.schema';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { SubmitScorecardDto } from './dto/submit-scorecard.dto';
import { NotificationsService } from '../notifications/notifications.service';
import {
  EmployerApplicant,
  EmployerApplicantDocument,
} from '../employer-pipeline/schemas/employer-applicant.schema';

@Injectable()
export class EmployerInterviewsService {
  constructor(
    @InjectModel(EmployerInterview.name)
    private interviewModel: Model<EmployerInterviewDocument>,
    @InjectModel(EmployerApplicant.name)
    private employerApplicantModel: Model<EmployerApplicantDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Resolve the real candidate (User) id from a linked EmployerApplicant.
   * Defensive: a missing/unlinked applicant simply yields undefined and never
   * fails the create flow.
   */
  private async resolveCandidateId(
    applicantId?: string,
  ): Promise<Types.ObjectId | undefined> {
    if (!applicantId) {
      return undefined;
    }
    try {
      const applicant = await this.employerApplicantModel
        .findById(applicantId)
        .exec();
      return (applicant?.candidateId as Types.ObjectId) || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Producers for an interview event. Always notifies the employer (owner).
   * Also notifies the candidate when the interview carries a candidateId
   * (candidate has no dedicated 'interviews' type → mapped to 'applications').
   */
  private async notifyInterview(
    interview: EmployerInterviewDocument,
    verb: string,
  ): Promise<void> {
    try {
      if (interview.ownerId) {
        await this.notificationsService.create({
          audience: 'employer',
          userId: String(interview.ownerId),
          type: 'interviews',
          text: `Interview ${verb}${interview.candidateName ? ` with ${interview.candidateName}` : ''}`,
          href: '/employer/interviews',
        });
      }
      const candidateId = (interview as any).candidateId;
      if (candidateId) {
        await this.notificationsService.create({
          audience: 'candidate',
          userId: String(candidateId),
          type: 'applications',
          text: `Your interview has been ${verb}`,
          href: '/app/applications',
        });
      }
    } catch {
      /* notifications must never break the interview flow */
    }
  }

  async findAll(
    ownerId: string,
    status?: string,
  ): Promise<EmployerInterviewDocument[]> {
    const query: any = { ownerId };
    if (status) {
      query.status = status;
    }
    return this.interviewModel.find(query).sort({ scheduledAt: -1 }).exec();
  }

  async create(
    ownerId: string,
    dto: ScheduleInterviewDto,
  ): Promise<EmployerInterviewDocument> {
    const candidateId = await this.resolveCandidateId(dto.applicantId);
    const interview = new this.interviewModel({
      ...dto,
      ownerId,
      ...(candidateId ? { candidateId } : {}),
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      status: 'scheduled',
    });
    const saved = await interview.save();
    await this.notifyInterview(saved, 'scheduled');
    return saved;
  }

  async findOne(
    ownerId: string,
    id: string,
  ): Promise<EmployerInterviewDocument> {
    const interview = await this.interviewModel
      .findOne({ _id: id, ownerId })
      .exec();
    if (!interview) {
      throw new NotFoundException('Interview not found');
    }
    return interview;
  }

  async update(
    ownerId: string,
    id: string,
    dto: UpdateInterviewDto,
  ): Promise<EmployerInterviewDocument> {
    const interview = await this.findOne(ownerId, id);

    if (dto.scheduledAt !== undefined) {
      interview.scheduledAt = new Date(dto.scheduledAt);
    }
    if (dto.durationMins !== undefined) {
      interview.durationMins = dto.durationMins;
    }
    if (dto.status !== undefined) {
      interview.status = dto.status;
    }

    const saved = await interview.save();
    await this.notifyInterview(saved, dto.status || 'updated');
    return saved;
  }

  async submitScorecard(
    ownerId: string,
    id: string,
    dto: SubmitScorecardDto,
  ): Promise<EmployerInterviewDocument> {
    const interview = await this.findOne(ownerId, id);

    const scorecard = {
      interviewerId: dto.interviewerId
        ? new Types.ObjectId(dto.interviewerId)
        : undefined,
      interviewerName: dto.interviewerName,
      competencies: dto.competencies || [],
      notes: dto.notes,
      recommendation: dto.recommendation,
    };

    interview.scorecards = [...(interview.scorecards || []), scorecard as any];
    return interview.save();
  }
}
