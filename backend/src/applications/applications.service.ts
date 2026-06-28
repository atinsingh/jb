import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from '../schemas/application.schema';
import { ApplicationEventsService } from './application-events.service';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    private readonly applicationEventsService: ApplicationEventsService,
  ) { }

  async createApplication(
    candidateId: string,
    jobId: string,
    coverLetter?: string,
    matchScore?: number,
    autoApplied: boolean = false,
  ): Promise<ApplicationDocument> {
    // Check if application already exists
    const existing = await this.applicationModel.findOne({
      candidateId,
      jobId,
    });

    if (existing) {
      throw new BadRequestException('Application already exists for this job');
    }

    const application = new this.applicationModel({
      candidateId,
      jobId,
      matchScore: matchScore || 0,
      coverLetter: coverLetter || '',
      status: 'pending',
      appliedAt: new Date(),
      autoApplied,
    });

    const saved = await application.save();
    await this.applicationEventsService.recordEvent({
      applicationId: saved._id as any,
      userId: saved.candidateId,
      type: 'queued',
      message: 'Application queued',
    });
    return saved;
  }

  async getApplicationById(applicationId: string): Promise<ApplicationDocument> {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('candidateId', '-password')
      .populate('jobId')
      .exec();

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  async getUserApplications(
    userId: string,
    status?: string,
  ): Promise<ApplicationDocument[]> {
    const query: any = { candidateId: userId };
    if (status) {
      query.status = status;
    }

    return this.applicationModel
      .find(query)
      .populate('jobId')
      .sort({ appliedAt: -1 })
      .exec();
  }

  async updateApplicationStatus(
    applicationId: string,
    status: string,
  ): Promise<ApplicationDocument> {
    const application = await this.applicationModel.findById(applicationId);
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const validStatuses = [
      'pending',
      'submitted',
      'reviewing',
      'interviewed',
      'rejected',
      'accepted',
    ];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    application.status = status;
    if (status === 'submitted' && !application.submittedAt) {
      application.submittedAt = new Date();
    }

    return application.save();
  }

  async deleteApplication(applicationId: string): Promise<void> {
    const result = await this.applicationModel.findByIdAndDelete(applicationId);
    if (!result) {
      throw new NotFoundException('Application not found');
    }
  }

  async getApplicationStats(userId: string): Promise<{
    total: number;
    pending: number;
    submitted: number;
    reviewing: number;
    interviewed: number;
    rejected: number;
    accepted: number;
    averageMatchScore: number;
  }> {
    const applications = await this.applicationModel.find({ candidateId: userId });

    const stats = {
      total: applications.length,
      pending: applications.filter((a) => a.status === 'pending').length,
      submitted: applications.filter((a) => a.status === 'submitted').length,
      reviewing: applications.filter((a) => a.status === 'reviewing').length,
      interviewed: applications.filter((a) => a.status === 'interviewed').length,
      rejected: applications.filter((a) => a.status === 'rejected').length,
      accepted: applications.filter((a) => a.status === 'accepted').length,
      averageMatchScore: 0,
    };

    if (applications.length > 0) {
      const totalScore = applications.reduce(
        (sum, a) => sum + (a.matchScore || 0),
        0,
      );
      stats.averageMatchScore = Math.round(totalScore / applications.length);
    }

    return stats;
  }
}
