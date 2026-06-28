import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Model } from 'mongoose';
import { Job, JobDocument } from '../../schemas/job.schema';

@Injectable()
export class GreenhouseMonitorService {
  private readonly logger = new Logger(GreenhouseMonitorService.name);

  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
  ) {}

  async run(boardTokens: string[] = []) {
    const boards = this.resolveBoards(boardTokens, process.env.GREENHOUSE_BOARDS);
    let fetched = 0;
    let upserts = 0;
    const newExternalIds: string[] = [];
    const perBoard: Record<string, number> = {};

    for (const board of boards) {
      try {
        const { data } = await axios.get(`https://boards.greenhouse.io/${board}?format=json`);
        if (!data?.jobs) continue;
        const jobs = Array.isArray(data.jobs) ? data.jobs : [];
        fetched += jobs.length;
        perBoard[board] = jobs.length;

        for (const job of jobs) {
          const externalId = `greenhouse:${job.id}`;
          const existed = await this.jobModel.exists({ externalId });
          const doc = {
            title: job.title,
            companyName: board || job?.offices?.[0]?.name || 'Unknown',
            location: job?.location?.name || 'Not specified',
            description: job.content || '',
            source: 'Greenhouse',
            externalUrl: job.absolute_url,
            canonicalUrl: job.absolute_url,
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
