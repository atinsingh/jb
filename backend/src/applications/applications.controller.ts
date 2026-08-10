import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  UseGuards,
  Request,
  Param,
  Query,
  Body,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApplicationsService } from './applications.service';
import { ApplicationAgentService } from './application-agent.service';
import { ApplicationEventsService } from './application-events.service';

import { ApplyRunnerService } from '../apply-runner/apply-runner.service';

@ApiTags('applications')
@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  private readonly logger = new Logger(ApplicationsController.name);

  constructor(
    private applicationsService: ApplicationsService,
    private applicationAgentService: ApplicationAgentService,
    private applicationEventsService: ApplicationEventsService,
    private applyRunnerService: ApplyRunnerService,
  ) { }

  @Post('queue/:jobId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Queue an application for a job' })
  @ApiParam({ name: 'jobId', description: 'Job ID to apply for' })
  @ApiResponse({ status: 200, description: 'Application queued successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async queueApplication(@Param('jobId') jobId: string, @Request() req) {
    this.logger.log(`📝 Queuing application for user ${req.user?.email || 'unknown'} - job ${jobId}`);
    const userId = req.user._id.toString();
    const application = await this.applicationsService.createApplication(
      userId,
      jobId,
    );
    this.logger.log(`✅ Application queued: ${application._id}`);
    return {
      message: 'Application queued successfully',
      application,
    };
  }

  @Post('apply/:jobId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Apply to a job' })
  @ApiParam({ name: 'jobId', description: 'Job ID to apply for' })
  @ApiResponse({ status: 200, description: 'Application created successfully' })
  @ApiResponse({ status: 400, description: 'Already applied to this job' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async applyToJob(@Param('jobId') jobId: string, @Request() req) {
    this.logger.log(`📝 Applying to job ${jobId} for user ${req.user?.email || 'unknown'}`);
    const userId = req.user._id.toString();

    // Check if already applied
    const existing = await this.applicationsService.getUserApplications(userId);
    const alreadyApplied = existing.some((app) => app.jobId.toString() === jobId);

    if (alreadyApplied) {
      this.logger.warn(`⚠️ User already applied to job ${jobId}`);
      throw new BadRequestException('Already applied to this job');
    }

    // This would need to use job matching service to get match and cover letter
    // For now, create a basic application
    const application = await this.applicationsService.createApplication(
      userId,
      jobId,
    );

    this.logger.log(`✅ Application created: ${application._id}`);
    return {
      message: 'Application created successfully',
      application,
    };
  }

  @Post('auto-apply')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Auto-apply to multiple jobs' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        jobIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of job IDs to apply for',
        },
      },
      required: ['jobIds'],
    },
  })
  @ApiResponse({ status: 200, description: 'Auto-application completed (inline) or queued' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async autoApply(@Body('jobIds') jobIds: string[], @Request() req) {
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      throw new BadRequestException('jobIds must be a non-empty array of job IDs');
    }
    this.logger.log(`🤖 Auto-applying for user ${req.user?.email || 'unknown'} to ${jobIds.length} jobs`);
    const userId = req.user._id.toString();
    // Producer: enqueues one batch job when the queue is enabled (returns
    // { queued: true, jobId }), otherwise runs inline and returns the original
    // { message, applications, count } shape. See requestAutoApply.
    const result = await this.applicationAgentService.requestAutoApply(userId, jobIds);
    if (result.queued) {
      this.logger.log(`📬 Auto-apply queued as job ${result.jobId}`);
    } else {
      this.logger.log(`✅ Auto-applied to ${result.count} jobs`);
    }
    return result;
  }

  @Get('should-apply/:jobId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Check if should auto-apply to a job' })
  @ApiParam({ name: 'jobId', description: 'Job ID to check' })
  @ApiResponse({ status: 200, description: 'Returns recommendation whether to apply' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async shouldAutoApply(@Param('jobId') jobId: string, @Request() req) {
    const userId = req.user._id.toString();
    const result = await this.applicationAgentService.shouldAutoApply(userId, jobId);
    return result;
  }

  @Get('my-applications')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user applications' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by application status' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results' })
  @ApiQuery({ name: 'skip', required: false, description: 'Skip number of results' })
  @ApiResponse({ status: 200, description: 'Applications retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyApplications(
    @Query('status') status: string,
    @Query('limit') limit: string,
    @Query('skip') skip: string,
    @Request() req,
  ) {
    this.logger.debug(`Getting applications for user ${req.user?.email || 'unknown'}`);
    const userId = req.user._id.toString();
    const applications = await this.applicationsService.getUserApplications(
      userId,
      status,
    );
    this.logger.debug(`Found ${applications.length} applications`);
    return {
      message: 'Applications retrieved successfully',
      applications,
      total: applications.length,
    };
  }

  @Get('activity')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get application activity events for the user' })
  @ApiQuery({ name: 'since', required: false, description: 'ISO date to filter events' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results (max 100)' })
  @ApiQuery({ name: 'skip', required: false, description: 'Skip number of results' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by event type (string or array)' })
  async getActivity(
    @Query('since') since: string,
    @Query('limit') limit: string,
    @Query('skip') skip: string,
    @Query('type') type: string | string[],
    @Request() req,
  ) {
    const userId = req.user._id.toString();
    const events = await this.applicationEventsService.getEventsForUser(userId, {
      since,
      limit: limit ? parseInt(limit, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      type,
    });
    return {
      message: 'Application activity retrieved successfully',
      events,
      total: events.length,
    };
  }

  @Post('process')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Process queued applications (stub runner)' })
  async processQueued(@Body('limit') limit: number = 10) {
    const result = await this.applyRunnerService.process(limit || 10);
    return { message: 'Processing complete', result };
  }

  @Get('stats')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get application statistics' })
  @ApiResponse({ status: 200, description: 'Application statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStats(@Request() req) {
    this.logger.debug(`Getting application stats for user ${req.user?.email || 'unknown'}`);
    const userId = req.user._id.toString();
    const stats = await this.applicationsService.getApplicationStats(userId);
    this.logger.debug(`Stats: ${stats.total} total applications`);
    return {
      message: 'Application statistics retrieved successfully',
      stats,
    };
  }

  @Get('stats/summary')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get application statistics summary' })
  @ApiResponse({ status: 200, description: 'Application statistics summary retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStatsSummary(@Request() req) {
    this.logger.debug(`Getting application stats summary for user ${req.user?.email || 'unknown'}`);
    const userId = req.user._id.toString();
    const applications = await this.applicationsService.getUserApplications(userId);
    const stats = this.applicationAgentService.getApplicationStats(applications);
    return {
      message: 'Application statistics retrieved successfully',
      stats,
    };
  }

  @Get('can-apply-more')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Check if user can apply to more jobs' })
  @ApiResponse({ status: 200, description: 'Returns whether user can apply to more jobs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async canApplyMore(@Request() req) {
    const userId = req.user._id.toString();
    const result = await this.applicationAgentService.canApplyMore(userId);
    return result;
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get application by ID' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Application retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Application does not belong to user' })
  async getApplication(@Param('id') id: string, @Request() req) {
    const application = await this.applicationsService.getApplicationById(id);
    // Verify the application belongs to the user
    if (application.candidateId.toString() !== req.user._id.toString()) {
      throw new UnauthorizedException('You do not have access to this application');
    }
    return {
      message: 'Application retrieved successfully',
      application,
    };
  }

  @Patch(':id/status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update application status' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'New application status',
        },
      },
      required: ['status'],
    },
  })
  @ApiResponse({ status: 200, description: 'Application status updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Application does not belong to user' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Request() req,
  ) {
    const application = await this.applicationsService.getApplicationById(id);
    // Verify the application belongs to the user
    if (application.candidateId.toString() !== req.user._id.toString()) {
      throw new UnauthorizedException('You do not have access to this application');
    }
    const updated = await this.applicationsService.updateApplicationStatus(id, status);
    return {
      message: 'Application status updated successfully',
      application: updated,
    };
  }

  @Post(':id/submit')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Submit an application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Application submitted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Application does not belong to user' })
  async submitApplication(@Param('id') id: string, @Request() req) {
    const application = await this.applicationsService.getApplicationById(id);
    // Verify the application belongs to the user
    if (application.candidateId.toString() !== req.user._id.toString()) {
      throw new UnauthorizedException('You do not have access to this application');
    }
    const submitted = await this.applicationAgentService.submitApplication(id);
    return {
      message: 'Application submitted successfully',
      application: submitted,
    };
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete an application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Application deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Application does not belong to user' })
  async deleteApplication(@Param('id') id: string, @Request() req) {
    const application = await this.applicationsService.getApplicationById(id);
    // Verify the application belongs to the user
    if (application.candidateId.toString() !== req.user._id.toString()) {
      throw new UnauthorizedException('You do not have access to this application');
    }
    await this.applicationsService.deleteApplication(id);
    return {
      message: 'Application deleted successfully',
    };
  }
}
