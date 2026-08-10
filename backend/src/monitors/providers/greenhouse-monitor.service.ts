import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Model } from 'mongoose';
import { Job, JobDocument } from '../../schemas/job.schema';
import { JobGeoService } from '../../geography/job-geo.service';
import { extractSkills } from '../../matching/skill-taxonomy';

@Injectable()
export class GreenhouseMonitorService {
  private readonly logger = new Logger(GreenhouseMonitorService.name);

  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    private geo: JobGeoService,
  ) {}

  async run(boardTokens: string[] = []) {
    const boards = this.resolveBoards(boardTokens, process.env.GREENHOUSE_BOARDS);
    let fetched = 0;
    let upserts = 0;
    const newExternalIds: string[] = [];
    const perBoard: Record<string, number> = {};

    for (const board of boards) {
      try {
        // Greenhouse's public Job Board API. The old `boards.greenhouse.io/<board>?format=json`
        // embed URL no longer returns JSON; `boards-api.greenhouse.io` is the current endpoint.
        // `content=true` includes the full HTML job description.
        const { data } = await axios.get(
          `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`,
        );
        if (!data?.jobs) continue;
        const jobs = Array.isArray(data.jobs) ? data.jobs : [];
        fetched += jobs.length;
        perBoard[board] = jobs.length;

        for (const job of jobs) {
          const externalId = `greenhouse:${job.id}`;
          const existed = await this.jobModel.exists({ externalId });
          const companyName = board || job?.offices?.[0]?.name || 'Unknown';
          const location = job?.location?.name || 'Not specified';
          const description = job.content || '';
          const g = this.geo.normalize({ location, description, title: job.title });
          const doc = {
            title: job.title,
            companyName,
            location,
            description,
            source: 'Greenhouse',
            externalUrl: job.absolute_url,
            canonicalUrl: job.absolute_url,
            externalId,
            scrapedAt: new Date(),
            skills: extractSkills(`${job.title}\n${description}`),
            companyLogo: this.geo.deriveLogo(companyName, job.absolute_url),
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
        this.logger.warn(`Greenhouse fetch failed for board ${board}: ${err.message}`);
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
}
