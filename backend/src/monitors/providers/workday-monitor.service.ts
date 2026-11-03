import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Model } from 'mongoose';
import { Job, JobDocument } from '../../schemas/job.schema';
import { resolveCountry } from '../../geography/geo.constants';
import { plainJobText } from '../plain-job-text';
import { isPostedToday, listedInCanada, MAX_OPEN_MARKET_PER_COMPANY } from '../fresh-canada-listing';

type WorkdaySite = { host: string; tenant: string; site: string };

// shortcut: Canadian employers whose public Workday board answered, set WORKDAY_SITES to replace
const DEFAULT_WORKDAY_SITES = [
  'td.wd3.myworkdayjobs.com/td/TD_Bank_Careers',
  'bmo.wd3.myworkdayjobs.com/bmo/External',
  'cibc.wd3.myworkdayjobs.com/cibc/search',
  'bb.wd3.myworkdayjobs.com/bb/BlackBerry',
  'thomsonreuters.wd5.myworkdayjobs.com/thomsonreuters/External_Career_Site',
];

const WORKDAY_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0',
};

const COMPANY_NAMES: Record<string, string> = {
  td: 'TD',
  bmo: 'BMO',
  cibc: 'CIBC',
  bb: 'BlackBerry',
  thomsonreuters: 'Thomson Reuters',
};

@Injectable()
export class WorkdayMonitorService {
  private readonly logger = new Logger(WorkdayMonitorService.name);

  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
  ) {}

  async run(sitesInput: string[] = []) {
    const sites = this.resolveSites(sitesInput, process.env.WORKDAY_SITES);
    const fetchDetails = (process.env.WORKDAY_FETCH_DETAILS || 'true') === 'true';
    const detailTimeout = parseInt(process.env.WORKDAY_DETAIL_TIMEOUT_MS || '4000', 10);

    let fetched = 0;
    let upserts = 0;
    const newExternalIds: string[] = [];
    const perSite: Record<string, number> = {};

    for (const site of sites) {
      const key = `${site.tenant}/${site.site}`;
      try {
        const count = await this.fetchSite(site, { fetchDetails, detailTimeout });
        fetched += count.fetched;
        upserts += count.upserts;
        newExternalIds.push(...count.newExternalIds);
        perSite[key] = count.upserts;
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
    site: WorkdaySite,
    options: { fetchDetails: boolean; detailTimeout: number },
  ) {
    let offset = 0;
    const limit = 20;
    let fetched = 0;
    let upserts = 0;
    let kept = 0;
    const newExternalIds: string[] = [];
    const base = `https://${site.host}/wday/cxs/${site.tenant}/${site.site}/jobs`;

    while (true) {
      const { data } = await axios.post(
        base,
        { appliedFacets: {}, limit, offset, searchText: '' },
        { headers: WORKDAY_HEADERS },
      );
      const postings = Array.isArray(data?.jobPostings) ? data.jobPostings : [];
      if (postings.length === 0) break;

      for (const job of postings) {
        if (kept >= MAX_OPEN_MARKET_PER_COMPANY) break;
        let location = this.place(job);
        const postedRaw = job.postedOn || job.startDate;
        if (!isPostedToday(postedRaw) || !listedInCanada({ country: resolveCountry(location) }, location)) continue;
        const postedAt = typeof postedRaw === 'string' && /^posted today$/i.test(postedRaw.trim())
          ? new Date()
          : new Date(postedRaw);
        const reqId = job.bulletFields?.[0] || job.externalPath;
        const externalId = `workday:${site.tenant}:${reqId}`;
        const existed = await this.jobModel.exists({ externalId });
        let description = job.title || '';
        let jobType = job?.timeType || 'Full-time';
        const externalUrl = job.externalPath
          ? `https://${site.host}/en-CA/${site.site}${job.externalPath}`
          : '';

        if (options.fetchDetails && job.externalPath) {
          try {
            const detail = await this.fetchDetails(site, job.externalPath, options.detailTimeout);
            description = detail.description || description;
            jobType = detail.jobType || jobType;
            if (detail.location && !/^\d+\s+locations$/i.test(detail.location)) location = detail.location;
          } catch (err: any) {
            this.logger.debug(`Detail fetch failed for ${externalId}: ${err.message}`);
          }
        }

        await this.jobModel.findOneAndUpdate(
          { externalId },
          {
            title: job.title,
            companyName: COMPANY_NAMES[site.tenant] || site.tenant,
            location,
            description,
            source: 'Workday',
            jobType,
            externalUrl,
            canonicalUrl: externalUrl,
            externalId,
            isExternal: true,
            isRemote: /remote/i.test(job.remoteType || ''),
            country: 'CA',
            postedAt,
            scrapedAt: new Date(),
          },
          { upsert: true, new: true },
        );
        upserts++;
        kept += 1;
        if (!existed) newExternalIds.push(externalId);
      }

      fetched += postings.length;
      offset += postings.length;

      if (kept >= MAX_OPEN_MARKET_PER_COMPANY || postings.length < limit) break;
    }

    return { fetched, upserts, newExternalIds };
  }

  private place(job: any): string {
    const named = job?.locations?.[0]?.displayName || job?.locations?.[0]?.name;
    if (named) return named;
    const text = String(job?.locationsText || '');
    if (text && !/^\d+\s+locations$/i.test(text)) return text;
    const slug = String(job?.externalPath || '').split('/')[2] || '';
    return slug.replace(/-/g, ' ') || 'Not specified';
  }

  private resolveSites(input: string[], envValue?: string): WorkdaySite[] {
    const fallbackHost = process.env.WORKDAY_DOMAIN || 'wd1.myworkdayjobs.com';
    const parse = (entry: string): WorkdaySite | null => {
      const slash = entry.split('/').map((s) => s.trim()).filter(Boolean);
      if (slash.length === 3) return { host: slash[0], tenant: slash[1], site: slash[2] };
      const parts = entry.split(':').map((s) => s.trim()).filter(Boolean);
      if (parts.length === 2) return { host: fallbackHost, tenant: parts[0], site: parts[1] };
      return null;
    };
    const chosen = input.length
      ? input
      : (envValue || '').split(',').map((s) => s.trim()).filter(Boolean);
    const parsed = chosen.map(parse).filter(Boolean) as WorkdaySite[];
    return parsed.length ? parsed : DEFAULT_WORKDAY_SITES.map(parse).filter(Boolean) as WorkdaySite[];
  }

  private async fetchDetails(site: WorkdaySite, externalPath: string, timeoutMs: number) {
    const url = `https://${site.host}/wday/cxs/${site.tenant}/${site.site}${externalPath}`;
    const { data } = await axios.get(url, { timeout: timeoutMs, headers: WORKDAY_HEADERS });
    const info = data?.jobPostingInfo || {};
    return {
      description: plainJobText(info.jobDescription || ''),
      jobType: info.timeType || info.workdayTimeType || '',
      location: info.location || info.locationsText || '',
    };
  }
}
