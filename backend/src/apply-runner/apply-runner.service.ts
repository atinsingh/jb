import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from '../schemas/application.schema';
import { ApplicationEventsService } from '../applications/application-events.service';

@Injectable()
export class ApplyRunnerService {
  private readonly logger = new Logger(ApplyRunnerService.name);

  constructor(
    @InjectModel(Application.name)
    private applicationModel: Model<ApplicationDocument>,
    private readonly applicationEventsService: ApplicationEventsService,
  ) { }

  /**
   * Placeholder processor for queued applications.
   * Future: integrate Playwright and ATS templates.
   */
  async process(limit = 10) {
    this.logger.log(`Processing up to ${limit} applications (stub)`);
    const applications = await this.applicationModel
      .find({ status: 'pending' })
      .limit(limit)
      .exec();

    for (const app of applications) {
      app.status = 'submitted';
      app.submittedAt = new Date();
      await app.save();
      await this.applicationEventsService.recordEvent({
        applicationId: app._id as any,
        userId: app.candidateId,
        type: 'submitted_stub',
        message: 'Marked as submitted by apply-runner stub',
      });
    }

    return {
      processed: applications.length,
      details: applications.map((a) => ({ id: a._id, jobId: a.jobId })),
    };
  }
}
