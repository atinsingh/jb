import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Model } from 'mongoose';
import { Job, JobDocument } from '../../schemas/job.schema';

type WorkdaySite = { tenant: string; site: string };

@Injectable()
export class WorkdayMonitorService {
  private readonly logger = new Logger(WorkdayMonitorService.name);

  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
  ) {}

  async run(sitesInput: string[] = []) {
    const sites = this.resolveSites(sitesInput, process.env.WORKDAY_SITES);
    const domain = process.env.WORKDAY_DOMAIN || 'wd1.myworkdayjobs.com';
    const fetchDetails = (process.env.WORKDAY_FETCH_DETAILS || 'true') === 'true';
    const detailTimeout = parseInt(process.env.WORKDAY_DETAIL_TIMEOUT_MS || '4000', 10);

    let fetched = 0;
    let upserts = 0;
    const newExternalIds: string[] = [];
    const perSite: Record<string, number> = {};

    for (const site of sites) {
      const key = `${site.tenant}/${site.site}`;
      try {
        const count = await this.fetchSite(domain, site, { fetchDetails, detailTimeout });
        fetched += count.fetched;
        upserts += count.upserts;
        newExternalIds.push(...count.newExternalIds);
        perSite[key] = count.fetched;
      } catch (err: any) {
        this.logger.warn(`Workday fetch failed for ${key}: ${err.message}`);
      }
    }

    return {
      sitesProcessed: sites.length,
      fetched,
      upserts,
      perSite,
      newExternalIds,
      processedAt: new Date().toISOString(),
    };
  }

  private async fetchSite(
    domain: string,
    site: WorkdaySite,
    options: { fetchDetails: boolean; detailTimeout: number },
  ) {
    let offset = 0;
    const limit = 50;
    let fetched = 0;
    let upserts = 0;
    const newExternalIds: string[] = [];

    // Typical Workday listings endpoint
    const base = `https://${domain}/wday/cxs/${site.tenant}/${site.site}/jobs`;

    while (true) {
      const url = `${base}?limit=${limit}&offset=${offset}`;
      const { data } = await axios.get(url);
      const postings = Array.isArray(data?.jobPostings) ? data.jobPostings : [];
      if (postings.length === 0) break;

      for (const job of postings) {
        const externalId = `workday:${site.tenant}:${job.id}`;
        const existed = await this.jobModel.exists({ externalId });
        let description = job?.externalPath || '';
        let jobType = job?.timeType || 'Full-time';
        let externalUrl = job?.externalPath
          ? `${base}/${job.externalPath}`
          : job?.externalUrl || '';
        let canonicalUrl = externalUrl;

        if (options.fetchDetails) {
          try {
            const detail = await this.fetchDetails(domain, site, job.id, options.detailTimeout);
            description = detail.description || description;
            jobType = detail.jobType || jobType;
            externalUrl = detail.externalUrl || externalUrl;
            canonicalUrl = externalUrl;
          } catch (err: any) {
            this.logger.debug(`Detail fetch failed for ${externalId}: ${err.message}`);
          }
        }

        const doc = {
          title: job.title,
          companyName: job?.hiringOrganization?.name || site.tenant,
          location: job?.locations?.[0]?.displayName || job?.locations?.[0]?.name || 'Not specified',
          description,
          source: 'Workday',
          jobType,
          externalUrl,
          canonicalUrl,
          externalId,
          scrapedAt: new Date(),
        };

        await this.jobModel.findOneAndUpdate(
          { externalId },
          doc,
          { upsert: true, new: true },
        );
        upserts++;
        if (!existed) newExternalIds.push(externalId);
      }

      fetched += postings.length;
      offset += postings.length;

      // Stop if less than limit returned (no more pages)
      if (postings.length < limit) break;
    }

    return { fetched, upserts, newExternalIds };
  }

  private resolveSites(input: string[], envValue?: string): WorkdaySite[] {
    const parse = (entry: string): WorkdaySite | null => {
      const parts = entry.split(':').map((s) => s.trim()).filter(Boolean);
      if (parts.length !== 2) return null;
      return { tenant: parts[0], site: parts[1] };
    };

    if (input && input.length) {
      return input
        .map(parse)
        .filter(Boolean) as WorkdaySite[];
    }
    if (envValue) {
      return envValue
        .split(',')
        .map(parse)
        .filter(Boolean) as WorkdaySite[];
    }
    return [];
  }

  private async fetchDetails(domain: string, site: WorkdaySite, jobId: string, timeoutMs: number) {
    const url = `https://${domain}/wday/cxs/${site.tenant}/${site.site}/jobs/${jobId}`;
    const { data } = await axios.get(url, { timeout: timeoutMs });
    const info = data?.jobPostingInfo || {};
    const description = info.jobDescription || info.jobPostingDetails || '';
    const jobType = info.timeType || info.workdayTimeType || '';
    const externalUrl = data?.externalPath
      ? `https://${domain}/en-US/${site.tenant}/${site.site}/job/${data.externalPath}`
      : data?.externalUrl || '';
    return { description, jobType, externalUrl };
  }
}
