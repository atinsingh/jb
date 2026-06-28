import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from '../schemas/application.schema';
import { Job, JobDocument } from '../schemas/job.schema';

export interface ApplicationStatusUpdate {
  status: string;
  notes?: string;
  changedBy?: string;
}

export interface TrackerFilters {
  status?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  companyName?: string;
  jobType?: string;
  search?: string;
}

@Injectable()
export class JobTrackerService {
  private readonly logger = new Logger(JobTrackerService.name);

  constructor(
    @InjectModel(Application.name)
    private applicationModel: Model<ApplicationDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
  ) {}

  /**
   * Get all applications for a user with filters
   */
  async getApplications(
    userId: string,
    filters?: TrackerFilters,
  ): Promise<ApplicationDocument[]> {
    const query: any = { candidateId: userId };

    if (filters?.status && filters.status.length > 0) {
      query.status = { $in: filters.status };
    }

    if (filters?.dateFrom || filters?.dateTo) {
      query.appliedAt = {};
      if (filters.dateFrom) query.appliedAt.$gte = filters.dateFrom;
      if (filters.dateTo) query.appliedAt.$lte = filters.dateTo;
    }

    const applications = await this.applicationModel
      .find(query)
      .populate('jobId')
      .sort({ appliedAt: -1 })
      .exec();

    // Apply additional filters that require populated data
    let filtered = applications;

    if (filters?.companyName) {
      filtered = filtered.filter((app: any) => {
        const job = app.jobId as JobDocument;
        return job?.companyName
          ?.toLowerCase()
          .includes(filters.companyName!.toLowerCase());
      });
    }

    if (filters?.jobType) {
      filtered = filtered.filter((app: any) => {
        const job = app.jobId as JobDocument;
        return job?.jobType === filters.jobType;
      });
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((app: any) => {
        const job = app.jobId as JobDocument;
        return (
          job?.title?.toLowerCase().includes(searchLower) ||
          job?.companyName?.toLowerCase().includes(searchLower) ||
          app.notes?.toLowerCase().includes(searchLower)
        );
      });
    }

    return filtered;
  }

  /**
   * Get application by ID
   */
  async getApplication(
    applicationId: string,
    userId: string,
  ): Promise<ApplicationDocument | null> {
    return this.applicationModel
      .findOne({ _id: applicationId, candidateId: userId })
      .populate('jobId')
      .exec();
  }

  /**
   * Update application status with timeline tracking
   */
  async updateApplicationStatus(
    applicationId: string,
    userId: string,
    update: ApplicationStatusUpdate,
  ): Promise<ApplicationDocument> {
    const application = await this.applicationModel.findOne({
      _id: applicationId,
      candidateId: userId,
    });

    if (!application) {
      throw new Error('Application not found');
    }

    const oldStatus = application.status;
    const newStatus = update.status;

    // Update status
    application.status = newStatus;

    // Add to timeline
    if (!application.statusTimeline) {
      application.statusTimeline = [];
    }

    application.statusTimeline.push({
      status: newStatus,
      timestamp: new Date(),
      notes: update.notes,
      changedBy: update.changedBy || 'user',
    });

    // Update timestamps based on status
    if (newStatus === 'submitted' && !application.submittedAt) {
      application.submittedAt = new Date();
    }

    return application.save();
  }

  /**
   * Get status timeline for an application
   */
  async getStatusTimeline(
    applicationId: string,
    userId: string,
  ): Promise<Array<{ status: string; timestamp: Date; notes?: string; changedBy?: string }>> {
    const application = await this.applicationModel.findOne({
      _id: applicationId,
      candidateId: userId,
    });

    if (!application) {
      throw new Error('Application not found');
    }

    return application.statusTimeline || [];
  }

  /**
   * Get application statistics
   */
  async getApplicationStats(userId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    recentActivity: number;
  }> {
    const applications = await this.applicationModel
      .find({ candidateId: userId })
      .exec();

    const byStatus: Record<string, number> = {};
    let recentActivity = 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const app of applications) {
      byStatus[app.status || 'pending'] = (byStatus[app.status || 'pending'] || 0) + 1;

      if (app.appliedAt && app.appliedAt >= thirtyDaysAgo) {
        recentActivity++;
      }
    }

    return {
      total: applications.length,
      byStatus,
      recentActivity,
    };
  }
}

