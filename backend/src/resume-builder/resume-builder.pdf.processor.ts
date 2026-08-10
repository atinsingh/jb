import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_PDF, JOB_GENERATE_PDF } from '../queue/queue.constants';
import { ResumeBuilderService } from './resume-builder.service';

interface GeneratePdfJobData {
  resumeId: string;
  userId: string;
}

/**
 * Bull consumer for résumé-PDF generation. Registered as a provider ONLY when
 * QUEUE_ENABLED=true (see resume-builder.module.ts). Its body just calls the
 * existing service method that renders + persists the PDF, so queued and inline
 * paths do exactly the same work.
 */
@Processor(QUEUE_PDF)
export class ResumeBuilderPdfProcessor {
  private readonly logger = new Logger(ResumeBuilderPdfProcessor.name);

  constructor(private readonly resumeBuilderService: ResumeBuilderService) {}

  @Process(JOB_GENERATE_PDF)
  async handleGenerate(job: Job<GeneratePdfJobData>) {
    const { resumeId, userId } = job.data;
    this.logger.debug(`Processing PDF job ${job.id} for resume ${resumeId}`);
    const result = await this.resumeBuilderService.generateAndPersistPdf(resumeId, userId);
    this.logger.debug(`PDF job ${job.id} complete: ${result.pdfPath}`);
    return result;
  }
}
