import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  EmployerJob,
  EmployerJobDocument,
} from './schemas/employer-job.schema';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class EmployerJobsService {
  constructor(
    @InjectModel(EmployerJob.name)
    private employerJobModel: Model<EmployerJobDocument>,
  ) {}

  async create(
    ownerId: string,
    dto: CreateJobDto,
  ): Promise<EmployerJobDocument> {
    const job = new this.employerJobModel({
      ...dto,
      ownerId,
    });
    return job.save();
  }

  async findAll(
    ownerId: string,
    status?: string,
  ): Promise<EmployerJobDocument[]> {
    const query: any = { ownerId };
    if (status) {
      query.status = status;
    }
    return this.employerJobModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(
    ownerId: string,
    id: string,
  ): Promise<EmployerJobDocument> {
    const job = await this.employerJobModel.findOne({ _id: id, ownerId }).exec();
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  async update(
    ownerId: string,
    id: string,
    dto: UpdateJobDto,
  ): Promise<EmployerJobDocument> {
    const job = await this.employerJobModel
      .findOneAndUpdate({ _id: id, ownerId }, { $set: dto }, { new: true })
      .exec();
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  async updateStatus(
    ownerId: string,
    id: string,
    status: string,
  ): Promise<EmployerJobDocument> {
    const job = await this.employerJobModel
      .findOneAndUpdate({ _id: id, ownerId }, { $set: { status } }, { new: true })
      .exec();
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const result = await this.employerJobModel
      .findOneAndDelete({ _id: id, ownerId })
      .exec();
    if (!result) {
      throw new NotFoundException('Job not found');
    }
  }
}
