import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_AUTO_APPLY, JOB_AUTO_APPLY } from '../queue/queue.constants';
import { ApplicationAgentService } from './application-agent.service';

interface AutoApplyJobData {
  userId: string;
  jobIds: string[];
}

/**
 * Bull consumer for candidate auto-apply batches. Registered as a provider ONLY
 * when QUEUE_ENABLED=true (see applications.module.ts). Its body just calls the
 * existing `autoApply` service method, so queued and inline paths do exactly the
 * same work — the only difference is that the slow loop runs off the request path.
 */
@Processor(QUEUE_AUTO_APPLY)
export class AutoApplyProcessor {
  private readonly logger = new Logger(AutoApplyProcessor.name);

  constructor(private readonly applicationAgentService: ApplicationAgentService) {}

  @Process(JOB_AUTO_APPLY)
  async handleAutoApply(job: Job<AutoApplyJobData>) {
    const { userId, jobIds } = job.data;
    this.logger.debug(
      `Processing auto-apply job ${job.id} for user ${userId} (${jobIds?.length ?? 0} jobs)`,
    );
    const applications = await this.applicationAgentService.autoApply(userId, jobIds);
    this.logger.debug(`Auto-apply job ${job.id} complete: ${applications.length} applications`);
    return applications;
  }
}
