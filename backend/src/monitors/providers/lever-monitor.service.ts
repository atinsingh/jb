import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Model } from 'mongoose';
import { Job, JobDocument } from '../../schemas/job.schema';
import { JobGeoService } from '../../geography/job-geo.service';
import { extractSkills } from '../../matching/skill-taxonomy';

@Injectable()
export class LeverMonitorService {
  private readonly logger = new Logger(LeverMonitorService.name);

  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    private geo: JobGeoService,
  ) {}

  async run(boardTokens: string[] = []) {
    const boards = this.resolveBoards(boardTokens, process.env.LEVER_BOARDS);
    let fetched = 0;
    let upserts = 0;
    const newExternalIds: string[] = [];
    const perBoard: Record<string, number> = {};

    for (const board of boards) {
      try {
        const { data } = await axios.get(`https://api.lever.co/v0/postings/${board}?mode=json`);
        const jobs = Array.isArray(data) ? data : [];
        fetched += jobs.length;
        perBoard[board] = jobs.length;

        for (const job of jobs) {
          const externalId = `lever:${job.id}`;
          const existed = await this.jobModel.exists({ externalId });
          const commitment = (job?.categories?.commitment || '').toLowerCase();
          const jobType = this.mapCommitment(commitment);
          const title = job.text || job.title;
          const location = job?.categories?.location || 'Not specified';
          const description = job.descriptionPlain || job.description || '';
          const url = job.hostedUrl || job.applyUrl;
          const workplaceHint = (job?.workplaceType || '') as string; // Lever exposes workplaceType
          const g = this.geo.normalize({ location, description, title, workplaceType: workplaceHint });
          const doc = {
            title,
            companyName: board || 'Unknown',
            location,
            description,
            source: 'Lever',
            jobType,
            externalUrl: url,
            canonicalUrl: url,
            externalId,
            scrapedAt: new Date(),
            skills: extractSkills(`${title}\n${description}`),
            companyLogo: this.geo.deriveLogo(board, url),
            country: g.country,
            region: g.region,
            city: g.city,
            workplaceType: g.workplaceType,
            remoteScope: g.remoteScope,
            eligibleCountries: g.eligibleCountries,
            excludedCountries: g.excludedCountries,
            sponsorship: g.sponsorship,
            locationConfidence: g.locationConfidence,
            needsGeoReview: g.needsGeoReview,
            geoEvidence: g.geoEvidence,
          };
          await this.jobModel.findOneAndUpdate(
            { externalId },
            doc,
            { upsert: true, new: true },
          );
          upserts++;
          if (!existed) newExternalIds.push(externalId);
        }
      } catch (err: any) {
        this.logger.warn(`Lever fetch failed for board ${board}: ${err.message}`);
      }
    }

    return {
      boardsProcessed: boards.length,
      fetched,
      upserts,
      newExternalIds,
      perBoard,
      processedAt: new Date().toISOString(),
    };
  }

  private resolveBoards(input: string[], envValue?: string): string[] {
    if (input && input.length) return input;
    if (envValue) {
      return envValue.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }

  private mapCommitment(commitment: string): string {
    switch (commitment) {
      case 'contract':
        return 'Contract';
      case 'internship':
        return 'Internship';
      case 'part-time':
      case 'part time':
        return 'Part-time';
      case 'temporary':
        return 'Temporary';
      case 'full-time':
      case 'full time':
      default:
        return 'Full-time';
    }
  }
}
