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

@Injectable()
export class EmployerInterviewsService {
  constructor(
    @InjectModel(EmployerInterview.name)
    private interviewModel: Model<EmployerInterviewDocument>,
  ) {}

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
    const interview = new this.interviewModel({
      ...dto,
      ownerId,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      status: 'scheduled',
    });
    return interview.save();
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

    return interview.save();
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
