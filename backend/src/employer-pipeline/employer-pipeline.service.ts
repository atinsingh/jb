import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  EmployerApplicant,
  EmployerApplicantDocument,
} from './schemas/employer-applicant.schema';
import { CreateApplicantDto } from './dto/create-applicant.dto';
import { NotificationsService } from '../notifications/notifications.service';

const STAGES = [
  'applied',
  'screening',
  'interview',
  'offer',
  'hired',
  'rejected',
];

export interface UpsertApplicantInput {
  ownerId?: string | Types.ObjectId;
  jobId: string | Types.ObjectId; // the EmployerJob._id
  candidateId: string | Types.ObjectId;
  candidateName?: string;
  candidateHeadline?: string;
  candidateEmail?: string;
  candidateLocation?: string;
  skills?: string[];
  yearsExperience?: number;
  aiScore?: number;
  source?: string;
  stage?: string;
}

@Injectable()
export class EmployerPipelineService {
  private readonly logger = new Logger(EmployerPipelineService.name);

  constructor(
    @InjectModel(EmployerApplicant.name)
    private applicantModel: Model<EmployerApplicantDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Idempotent applicant writer used by the candidate-apply → pipeline bridge.
   * Keyed on (jobId, candidateId): a candidate re-applying updates the same row
   * instead of creating duplicates, and never resets a stage the employer has
   * already advanced. `create()` is left untouched for manual employer adds.
   */
  async upsertApplicant(
    input: UpsertApplicantInput,
  ): Promise<EmployerApplicantDocument> {
    const jobId = new Types.ObjectId(String(input.jobId));
    const candidateId = new Types.ObjectId(String(input.candidateId));

    const setOnInsert: Record<string, unknown> = {
      jobId,
      candidateId,
      stage: input.stage || 'applied',
      source: input.source || 'jobocate_apply',
      rating: 0,
      appliedAt: new Date(),
    };
    if (input.ownerId) {
      setOnInsert.ownerId = new Types.ObjectId(String(input.ownerId));
    }

    return this.applicantModel.findOneAndUpdate(
      { jobId, candidateId },
      {
        $setOnInsert: setOnInsert,
        $set: {
          candidateName: input.candidateName ?? '',
          candidateHeadline: input.candidateHeadline ?? '',
          candidateEmail: input.candidateEmail ?? '',
          candidateLocation: input.candidateLocation ?? '',
          skills: input.skills ?? [],
          yearsExperience: input.yearsExperience ?? 0,
          aiScore: input.aiScore ?? 0,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  async list(
    ownerId: string,
    jobId?: string,
    stage?: string,
  ): Promise<EmployerApplicantDocument[]> {
    const query: any = { ownerId };
    if (jobId) {
      query.jobId = jobId;
    }
    if (stage) {
      query.stage = stage;
    }
    return this.applicantModel.find(query).sort({ appliedAt: -1 }).exec();
  }

  async findOne(
    ownerId: string,
    id: string,
  ): Promise<EmployerApplicantDocument> {
    const applicant = await this.applicantModel
      .findOne({ _id: id, ownerId })
      .exec();
    if (!applicant) {
      throw new NotFoundException('Applicant not found');
    }
    return applicant;
  }

  async create(
    ownerId: string,
    dto: CreateApplicantDto,
  ): Promise<EmployerApplicantDocument> {
    const applicant = new this.applicantModel({
      ...dto,
      ownerId,
      stage: dto.stage || 'applied',
      aiScore: dto.aiScore ?? 0,
      rating: dto.rating ?? 0,
      appliedAt: new Date(),
    });
    return applicant.save();
  }

  async updateStage(
    ownerId: string,
    id: string,
    stage: string,
  ): Promise<EmployerApplicantDocument> {
    const applicant = await this.findOne(ownerId, id);
    applicant.stage = stage;
    const saved = await applicant.save();

    // Producer: notify the employer that a candidate moved stage.
    try {
      if (saved.ownerId) {
        await this.notificationsService.create({
          audience: 'employer',
          userId: String(saved.ownerId),
          type: 'applicants',
          text: `${saved.candidateName || 'Applicant'} moved to ${stage}`,
          href: '/employer/pipeline',
        });
      }
    } catch {
      /* notifications must never break the pipeline flow */
    }

    return saved;
  }

  async addNote(
    ownerId: string,
    id: string,
    text: string,
  ): Promise<EmployerApplicantDocument> {
    const applicant = await this.findOne(ownerId, id);
    applicant.notes = applicant.notes || [];
    applicant.notes.push({
      authorId: new Types.ObjectId(ownerId),
      text,
      createdAt: new Date(),
    });
    return applicant.save();
  }

  async stats(
    ownerId: string,
    jobId?: string,
  ): Promise<Record<string, number> & { total: number }> {
    const query: any = { ownerId };
    if (jobId) {
      query.jobId = jobId;
    }
    const applicants = await this.applicantModel.find(query).exec();

    const stats: Record<string, number> & { total: number } = {
      total: applicants.length,
      applied: 0,
      screening: 0,
      interview: 0,
      offer: 0,
      hired: 0,
      rejected: 0,
    };

    for (const stage of STAGES) {
      stats[stage] = applicants.filter((a) => a.stage === stage).length;
    }

    return stats;
  }
}
