import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_ATS, JOB_ATS_SUBMIT } from '../queue/queue.constants';
import { ApplyRunnerService } from './apply-runner.service';

interface AtsSubmitJobData {
  limit?: number;
}

/**
 * Bull consumer for headless ATS submission. Registered as a provider ONLY when
 * QUEUE_ENABLED=true (see apply-runner.module.ts). Its body just calls the same
 * `process()` the inline path calls, so queued and inline runs do identical work
 * off/on the request path. The AUTO_APPLICATION_ENABLED gate lives inside
 * `process()`, so an enabled queue with auto-apply OFF still submits nothing.
 */
@Processor(QUEUE_ATS)
export class AtsSubmitProcessor {
  private readonly logger = new Logger(AtsSubmitProcessor.name);

  constructor(private readonly runner: ApplyRunnerService) {}

  @Process(JOB_ATS_SUBMIT)
  async handleSubmit(job: Job<AtsSubmitJobData>) {
    const limit = job.data?.limit ?? 10;
    this.logger.debug(`Processing ATS submit job ${job.id} (limit ${limit})`);

    // Two distinct populations, both gated on AUTO_APPLICATION_ENABLED inside
    // the runner:
    //   commitApproved — prepared applications the candidate has approved
    //   process        — the legacy pending -> submit path
    const committed = await this.runner.commitApproved(limit);
    const result = await this.runner.process(limit);

    this.logger.debug(
      `ATS submit job ${job.id} complete: ${committed.processed} approved committed, ${result.processed} legacy processed`,
    );
    return { committed, legacy: result };
  }
}
