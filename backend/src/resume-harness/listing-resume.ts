import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { plainJobText } from '../monitors/plain-job-text';
import { StartSessionDto } from './dto/resume-harness.dto';

const DESCRIPTION_MAX = 20000;

/**
 * Paid-only résumé start for a job already stored on /jobs.
 * The client description and URL are ignored so this path never fetches the
 * employer's site and never starts from text the browser invented.
 */
export function listingResumeInput(
  tier: string | undefined,
  job: { title?: string; description?: string } | null,
  dto: StartSessionDto,
) {
  if (tier !== 'PRO') {
    throw new ForbiddenException(
      'Generating a résumé for a listed role is included with the paid plan.',
    );
  }
  const title = job?.title?.trim();
  if (!job || !title) throw new NotFoundException('Job not found');
  const description = plainJobText(job.description || '').slice(0, DESCRIPTION_MAX);
  return {
    model: dto.model,
    effort: dto.effort,
    targetRole: title.slice(0, 200),
    ...(description ? { jobDescription: description } : {}),
    ...(dto.carryFromSessionId ? { carryFromSessionId: dto.carryFromSessionId } : {}),
    ...(dto.templateKey ? { templateKey: dto.templateKey } : {}),
    ...(dto.vibe ? { vibe: dto.vibe } : {}),
  };
}
