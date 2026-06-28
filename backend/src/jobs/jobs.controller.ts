import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
  Param,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JobsService } from './jobs.service';

@ApiTags('jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(private jobsService: JobsService) {}

  @Post('scrape')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Scrape jobs from job boards' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of keywords to search for',
        },
        location: {
          type: 'string',
          description: 'Location to search in (optional)',
        },
      },
      required: ['keywords'],
    },
  })
  @ApiResponse({ status: 200, description: 'Job scraping completed' })
  @ApiResponse({ status: 400, description: 'Keywords array required' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async scrapeJobs(
    @Body() body: { keywords: string[]; location?: string },
    @Request() req,
  ) {
    const { keywords, location = '' } = body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      throw new BadRequestException('Keywords array required');
    }

    this.logger.log(
      `🔍 User ${req.user?.email || 'unknown'} scraping jobs for: ${keywords.join(', ')}`,
    );

    const result = await this.jobsService.scrapeAndSave(keywords, location);

    return {
      message: 'Job scraping completed',
      scraped: result.scraped,
      saved: result.saved,
    };
  }

  @Get('search')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Search for jobs' })
  @ApiQuery({ name: 'keywords', required: false, description: 'Search keywords' })
  @ApiQuery({ name: 'location', required: false, description: 'Job location' })
  @ApiQuery({ name: 'skills', required: false, description: 'Required skills' })
  @ApiQuery({ name: 'source', required: false, description: 'Job source' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results', type: Number })
  @ApiQuery({ name: 'skip', required: false, description: 'Skip number of results', type: Number })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async searchJobs(@Query() query: any) {
    this.logger.debug(`Searching jobs with query: ${JSON.stringify(query)}`);

    const result = await this.jobsService.searchJobs({
      keywords: query.keywords,
      location: query.location,
      skills: query.skills,
      source: query.source,
      limit: query.limit ? parseInt(query.limit, 10) : 50,
      skip: query.skip ? parseInt(query.skip, 10) : 0,
    });

    return {
      message: 'Jobs retrieved successfully',
      ...result,
    };
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all jobs' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results', type: Number })
  @ApiQuery({ name: 'skip', required: false, description: 'Skip number of results', type: Number })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllJobs(@Query('limit') limit: string, @Query('skip') skip: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const skipNum = skip ? parseInt(skip, 10) : 0;

    this.logger.debug(`Getting all jobs (limit: ${limitNum}, skip: ${skipNum})`);

    const result = await this.jobsService.findAll(limitNum, skipNum);

    return {
      message: 'Jobs retrieved successfully',
      ...result,
    };
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get job by ID' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJob(@Param('id') id: string) {
    this.logger.debug(`Getting job: ${id}`);
    const job = await this.jobsService.findById(id);
    return {
      message: 'Job retrieved successfully',
      job,
    };
  }
}

