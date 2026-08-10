import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job, JobDocument } from '../schemas/job.schema';

/**
 * Public job listing for the marketing /jobs page.
 *
 * JobsController is guarded end to end, but /jobs is a logged-out acquisition
 * page — it previously shipped six hardcoded sample listings and a hardcoded
 * "1,284 open roles" headline while ~1,750 real scraped jobs sat in the
 * database unused.
 *
 * This exposes only what a visitor needs to browse: title, company, location,
 * type, salary and the apply link. Match scores stay behind auth, which is what
 * the "sign in to reveal" affordance on the card promises.
 */
@ApiTags('public-jobs')
@Controller('public/jobs')
export class PublicJobsController {
  constructor(@InjectModel(Job.name) private readonly jobModel: Model<JobDocument>) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Browse active public job listings' })
  async list(
    @Query('q') q?: string,
    @Query('location') location?: string,
    @Query('remote') remote?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const perPage = Math.min(parseInt(limit || '10', 10) || 10, 50);
    const current = Math.max(parseInt(page || '1', 10) || 1, 1);

    const filter: Record<string, unknown> = { isActive: true };

    if (q && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: rx }, { companyName: rx }, { description: rx }];
    }
    if (location && location.trim()) {
      const rx = new RegExp(location.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      // `location` is the free-text label; city/country carry the parsed values.
      filter.$and = [{ $or: [{ location: rx }, { city: rx }, { country: rx }] }];
    }
    if (remote === 'true') filter.isRemote = true;

    const [rows, total] = await Promise.all([
      this.jobModel
        .find(filter)
        .select(
          'title companyName companyLogo location city country isRemote jobType salary salaryDisclosed experience externalUrl originalApplyUrl createdAt preferredSkills',
        )
        .sort({ createdAt: -1 })
        .skip((current - 1) * perPage)
        .limit(perPage)
        .lean()
        .exec(),
      this.jobModel.countDocuments(filter),
    ]);

    const now = Date.now();
    const jobs = rows.map((j: any) => ({
      id: String(j._id),
      title: j.title,
      company: j.companyName,
      logo: j.companyLogo || null,
      location: j.location || [j.city, j.country].filter(Boolean).join(', ') || null,
      isRemote: !!j.isRemote,
      jobType: j.jobType || null,
      salary: j.salaryDisclosed ? j.salary || null : null,
      experience: j.experience || null,
      tags: Array.isArray(j.preferredSkills) ? j.preferredSkills.slice(0, 3) : [],
      applyUrl: j.originalApplyUrl || j.externalUrl || null,
      // "NEW" badge in the design = posted within the last 7 days.
      isNew: j.createdAt ? now - new Date(j.createdAt).getTime() < 7 * 864e5 : false,
    }));

    return { jobs, total, page: current, perPage, pages: Math.ceil(total / perPage) };
  }

  @Get(':id')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Public detail for one job listing' })
  async detail(@Param('id') id: string) {
    if (!isValidObjectId(id)) throw new NotFoundException('Job not found');

    const j: any = await this.jobModel
      .findOne({ _id: id, isActive: true })
      .select(
        'title companyName companyLogo location city country isRemote remoteScope jobType salary salaryDisclosed experience description requirements preferredSkills externalUrl originalApplyUrl canonicalUrl attributionText createdAt',
      )
      .lean()
      .exec();

    if (!j) throw new NotFoundException('Job not found');

    // Three more roles at a similar level, for the "Similar roles" rail. Real
    // rows only — the page previously hardcoded Notion/Linear/Figma listings.
    const firstWord = String(j.title || '').split(/[\s,\-–]/)[0];
    const similar = firstWord
      ? await this.jobModel
          .find({
            _id: { $ne: j._id },
            isActive: true,
            title: new RegExp(firstWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
          })
          .select('title companyName companyLogo location isRemote salary salaryDisclosed')
          .limit(3)
          .lean()
          .exec()
      : [];

    return {
      id: String(j._id),
      title: j.title,
      company: j.companyName,
      logo: j.companyLogo || null,
      location: j.location || [j.city, j.country].filter(Boolean).join(', ') || null,
      isRemote: !!j.isRemote,
      remoteScope: j.remoteScope || null,
      jobType: j.jobType || null,
      salary: j.salaryDisclosed ? j.salary || null : null,
      experience: j.experience || null,
      description: j.description || '',
      requirements: Array.isArray(j.requirements) ? j.requirements : [],
      skills: Array.isArray(j.preferredSkills) ? j.preferredSkills.slice(0, 6) : [],
      applyUrl: j.originalApplyUrl || j.externalUrl || j.canonicalUrl || null,
      attribution: j.attributionText || null,
      postedAt: j.createdAt || null,
      similar: similar.map((s: any) => ({
        id: String(s._id),
        title: s.title,
        company: s.companyName,
        location: s.isRemote ? 'Remote' : s.location || null,
        salary: s.salaryDisclosed ? s.salary || null : null,
      })),
    };
  }
}
