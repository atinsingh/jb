import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  EmployerApplicant,
  EmployerApplicantDocument,
} from './schemas/employer-applicant.schema';
import { CreateApplicantDto } from './dto/create-applicant.dto';

const STAGES = [
  'applied',
  'screening',
  'interview',
  'offer',
  'hired',
  'rejected',
];

@Injectable()
export class EmployerPipelineService {
  constructor(
    @InjectModel(EmployerApplicant.name)
    private applicantModel: Model<EmployerApplicantDocument>,
  ) {}

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
    return applicant.save();
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
