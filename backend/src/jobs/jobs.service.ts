import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job, JobDocument } from '../schemas/job.schema';
import { JobScraperService } from '../job-scraper/job-scraper.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    private jobScraperService: JobScraperService,
  ) {}

  async scrapeAndSave(keywords: string[], location: string = ''): Promise<{
    scraped: number;
    saved: number;
  }> {
    this.logger.log(`🔍 Scraping jobs for: ${keywords.join(', ')} in ${location || 'any location'}`);

    const scrapedJobs = await this.jobScraperService.scrapeAllSources(keywords, location);
    const uniqueJobs = this.jobScraperService.removeDuplicates(scrapedJobs);

    let savedCount = 0;
    for (const jobData of uniqueJobs) {
      try {
        await this.jobModel.findOneAndUpdate(
          { externalId: jobData.externalId },
          jobData,
          { upsert: true, new: true },
        );
        savedCount++;
      } catch (error: any) {
        this.logger.error(`Error saving job ${jobData.externalId}:`, error.message);
      }
    }

    this.logger.log(`✅ Scraped ${scrapedJobs.length} jobs, saved ${savedCount} to database`);
    return { scraped: scrapedJobs.length, saved: savedCount };
  }

  async searchJobs(query: {
    keywords?: string;
    location?: string;
    skills?: string;
    source?: string;
    limit?: number;
    skip?: number;
  }): Promise<{ jobs: JobDocument[]; total: number; limit: number; skip: number }> {
    const {
      keywords,
      location,
      skills,
      source,
      limit = 50,
      skip = 0,
    } = query;

    const mongoQuery: any = { isActive: true };

    // Text search
    if (keywords) {
      mongoQuery.$text = { $search: keywords };
    }

    // Location filter
    if (location) {
      mongoQuery.location = { $regex: location, $options: 'i' };
    }

    // Skills filter
    if (skills) {
      const skillsArray = skills.split(',').map((s) => s.trim());
      mongoQuery.skills = { $in: skillsArray };
    }

    // Source filter
    if (source) {
      mongoQuery.source = source;
    }

    const jobs = await this.jobModel
      .find(mongoQuery)
      .sort({ scrapedAt: -1 })
      .limit(parseInt(limit.toString(), 10))
      .skip(parseInt(skip.toString(), 10))
      .exec();

    const total = await this.jobModel.countDocuments(mongoQuery);

    this.logger.debug(`Found ${jobs.length} jobs matching search criteria`);
    return { jobs, total, limit: parseInt(limit.toString(), 10), skip: parseInt(skip.toString(), 10) };
  }

  async findAll(limit: number = 50, skip: number = 0): Promise<{
    jobs: JobDocument[];
    total: number;
    limit: number;
    skip: number;
  }> {
    const jobs = await this.jobModel
      .find({ isActive: true })
      .sort({ scrapedAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();

    const total = await this.jobModel.countDocuments({ isActive: true });

    return { jobs, total, limit, skip };
  }

  async findById(id: string): Promise<JobDocument> {
    const job = await this.jobModel.findById(id);
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  // ---------------------------------------------------------------------------
  // Admin moderation console (ROLE_ADMIN only — guarded at the controller layer)
  // ---------------------------------------------------------------------------

  /**
   * Paginated moderation list. Unlike searchJobs(), this does NOT hardcode
   * isActive:true — admins must see inactive/rejected/expired jobs too. `q`
   * matches title OR companyName case-insensitively. Newest first.
   */
  async adminList(params: {
    lifecycle?: string;
    moderationStatus?: string;
    q?: string;
    page?: number | string;
    limit?: number | string;
  }): Promise<{ jobs: JobDocument[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(String(params.page ?? 1), 10) || 1);
    const limit = Math.max(1, parseInt(String(params.limit ?? 20), 10) || 20);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (params.lifecycle) filter.lifecycle = params.lifecycle;
    if (params.moderationStatus) filter.moderationStatus = params.moderationStatus;
    if (params.q) {
      const rx = new RegExp(params.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: rx }, { companyName: rx }];
    }

    const jobs = await this.jobModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.jobModel.countDocuments(filter);
    return { jobs, total, page, limit };
  }

  /** Set a job's moderation status (auto_approved | needs_review | approved | rejected). */
  async adminSetModeration(id: string, moderationStatus: string): Promise<JobDocument> {
    const job = await this.jobModel.findByIdAndUpdate(
      id,
      { $set: { moderationStatus } },
      { new: true, runValidators: true },
    );
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    this.logger.log(`Admin set moderationStatus=${moderationStatus} for job ${id}`);
    return job;
  }

  /** Set a job's lifecycle stage (draft | published | paused | expired | ...). */
  async adminSetLifecycle(id: string, lifecycle: string): Promise<JobDocument> {
    const job = await this.jobModel.findByIdAndUpdate(
      id,
      { $set: { lifecycle } },
      { new: true, runValidators: true },
    );
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    this.logger.log(`Admin set lifecycle=${lifecycle} for job ${id}`);
    return job;
  }

  /** Take a job off the marketplace without deleting it. */
  async adminDeactivate(id: string): Promise<JobDocument> {
    const job = await this.jobModel.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true },
    );
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    this.logger.log(`Admin deactivated job ${id}`);
    return job;
  }
}

