import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Model } from 'mongoose';
import { Job, JobDocument } from '../../schemas/job.schema';
import { JobGeoService } from '../../geography/job-geo.service';
import { plainJobText } from '../plain-job-text';
import { isPostedToday, listedInCanada, MAX_OPEN_MARKET_PER_COMPANY } from '../fresh-canada-listing';

// shortcut: Canadian companies on Ashby's public board, set ASHBY_BOARDS to replace
const DEFAULT_ASHBY_BOARDS = ['wealthsimple', 'jobber', '1password', 'koho', 'lightspeedhq', 'clearco'];

const COMPANY_NAMES: Record<string, string> = {
  lightspeedhq: 'Lightspeed',
  '1password': '1Password',
};

@Injectable()
export class AshbyMonitorService {
  private readonly logger = new Logger(AshbyMonitorService.name);

  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    private geo: JobGeoService,
  ) {}

  async run(boardTokens: string[] = []) {
    const boards = this.resolveBoards(boardTokens, process.env.ASHBY_BOARDS);
    let fetched = 0;
    let upserts = 0;
    const newExternalIds: string[] = [];
    const perBoard: Record<string, number> = {};

    for (const board of boards) {
      try {
        const { data } = await axios.get(`https://api.ashbyhq.com/posting-api/job-board/${board}`);
        const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
        fetched += jobs.length;
        const ranked = jobs
          .filter((job) => isPostedToday(job.publishedAt))
          .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        let kept = 0;

        for (const job of ranked) {
          const location = [job.location, job.address?.postalAddress?.addressCountry].filter(Boolean).join(', ');
          if (!listedInCanada(null, location)) continue;
          if (kept >= MAX_OPEN_MARKET_PER_COMPANY) break;
          kept += 1;
          const externalId = `ashby:${job.id}`;
          const existed = await this.jobModel.exists({ externalId });
          const companyName = COMPANY_NAMES[board] || board.charAt(0).toUpperCase() + board.slice(1);
          const url = job.jobUrl || job.applyUrl;
          await this.jobModel.findOneAndUpdate(
            { externalId },
            {
              title: job.title,
              companyName,
              companyLogo: this.geo.deriveLogo(companyName, url),
              location: location || 'Canada',
              description: job.descriptionPlain || plainJobText(job.descriptionHtml || ''),
              source: 'Ashby',
              jobType: job.employmentType || 'Full-time',
              externalUrl: url,
              canonicalUrl: url,
              originalApplyUrl: job.applyUrl || url,
              externalId,
              isExternal: true,
              isRemote: !!job.isRemote,
              country: 'CA',
              postedAt: new Date(job.publishedAt),
              scrapedAt: new Date(),
            },
            { upsert: true, new: true },
          );
          upserts++;
          if (!existed) newExternalIds.push(externalId);
        }
        perBoard[board] = kept;
      } catch (err: any) {
        this.logger.warn(`Ashby fetch failed for board ${board}: ${err.message}`);
      }
    }

    return { boardsProcessed: boards.length, fetched, upserts, newExternalIds, perBoard, processedAt: new Date().toISOString() };
  }

  private resolveBoards(input: string[], envValue?: string): string[] {
    if (input && input.length) return input;
    const fromEnv = (envValue || '').split(',').map((s) => s.trim()).filter(Boolean);
    return fromEnv.length ? fromEnv : DEFAULT_ASHBY_BOARDS;
  }
}
