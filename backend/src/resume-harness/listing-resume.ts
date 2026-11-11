import { NotFoundException } from '@nestjs/common';
import { plainJobText } from '../monitors/plain-job-text';
import { StartSessionDto } from './dto/resume-harness.dto';

const DESCRIPTION_MAX = 20000;

/**
 * Résumé start for a job already stored on /jobs.
 * The client description and URL are ignored so this path never fetches the
 * employer's site and never starts from text the browser invented.
 * Credit and model checks still apply; the listing itself is not paid-only.
 */
export function listingResumeInput(
  _tier: string | undefined,
  job: { title?: string; description?: string } | null,
  dto: StartSessionDto,
) {
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
