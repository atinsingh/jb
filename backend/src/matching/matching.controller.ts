import {
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  Request,
  Param,
  Query,
  Body,
  Logger,
  BadRequestException,
  Inject,
  forwardRef,
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
import { MatchingService } from './matching.service';
import { EligibleJobsService } from './eligible-jobs.service';
import { ExpressInterestDto, InterestStatus } from './dto/express-interest.dto';
import { AgentAssignmentService } from '../applications/agent-assignment.service';

@ApiTags('matching')
@Controller('matching')
@UseGuards(JwtAuthGuard)
export class MatchingController {
  private readonly logger = new Logger(MatchingController.name);

  constructor(
    private matchingService: MatchingService,
    private eligibleJobsService: EligibleJobsService,
    @Inject(forwardRef(() => AgentAssignmentService))
    private agentAssignmentService: AgentAssignmentService,
  ) {}

  @Get('eligible-jobs')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Geographically/legally eligible jobs for the candidate (Stage 1)' })
  @ApiQuery({ name: 'keywords', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'profileId', required: false, description: 'Job profile driving this search (defaults to the active profile)' })
  async eligibleJobs(
    @Request() req,
    @Query('keywords') keywords?: string,
    @Query('limit') limit?: string,
    @Query('profileId') profileId?: string,
  ) {
    return this.eligibleJobsService.getEligibleJobs(req.user._id.toString(), {
      keywords,
      profileId,
      limit: limit ? parseInt(limit, 10) : 40,
      includeConditional: true,
    });
  }

  @Get('preview')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Preview how current preferences shape matching (real counts)' })
  @ApiQuery({ name: 'profileId', required: false })
  async preview(@Request() req, @Query('profileId') profileId?: string) {
    return this.eligibleJobsService.previewImpact(req.user._id.toString(), profileId);
  }

  @Post('calculate/:jobId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Calculate match score for a job' })
  @ApiParam({ name: 'jobId', description: 'Job ID to calculate match for' })
  @ApiResponse({ status: 200, description: 'Match calculated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async calculateMatch(@Param('jobId') jobId: string, @Request() req) {
    this.logger.log(`🎯 Calculating match for user ${req.user?.email || 'unknown'} - job ${jobId}`);
    const match = await this.matchingService.calculateMatch(req.user._id.toString(), jobId);
    this.logger.log(`✅ Match calculated: ${match.matchScore}% for job ${jobId}`);
    return {
      message: 'Match calculated successfully',
      match,
    };
  }

  @Get('matches')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get job matches for user' })
  @ApiQuery({ name: 'minScore', required: false, description: 'Minimum match score', type: Number })
  @ApiQuery({ name: 'isInterested', required: false, description: 'Filter by interest status' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results', type: Number })
  @ApiQuery({ name: 'skip', required: false, description: 'Skip number of results', type: Number })
  @ApiResponse({ status: 200, description: 'Matches retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMatches(
    @Query('minScore') minScore: string,
    @Query('isInterested') isInterested: string,
    @Query('limit') limit: string,
    @Query('skip') skip: string,
    @Request() req,
  ) {
    this.logger.debug(`Getting matches for user ${req.user?.email || 'unknown'}`);
    const minScoreNum = minScore ? parseInt(minScore, 10) : undefined;
    const matches = await this.matchingService.getMatches(
      req.user._id.toString(),
      minScoreNum,
    );
    this.logger.debug(`Found ${matches.length} matches`);
    return {
      message: 'Matches retrieved successfully',
      matches,
      total: matches.length,
    };
  }

  @Get('recommendations')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get job recommendations for user' })
  @ApiQuery({ name: 'minScore', required: false, description: 'Minimum match score (default: 60)', type: Number })
  @ApiResponse({ status: 200, description: 'Recommendations retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRecommendations(@Query('minScore') minScore: string, @Request() req) {
    this.logger.log(`🤖 Generating recommendations for user ${req.user?.email || 'unknown'}`);
    const minScoreNum = minScore ? parseInt(minScore, 10) : 60;
    const recommendations = await this.matchingService.getRecommendations(
      req.user._id.toString(),
      minScoreNum,
    );
    this.logger.log(`✅ Generated ${recommendations.length} recommendations`);
    return {
      message: 'Recommendations retrieved successfully',
      recommendations,
      total: recommendations.length,
    };
  }

  @Get('interested')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get jobs user is interested in' })
  @ApiResponse({ status: 200, description: 'Interested jobs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getInterestedJobs(@Request() req) {
    this.logger.debug(`Getting interested jobs for user ${req.user?.email || 'unknown'}`);
    const matches = await this.matchingService.getMatches(req.user._id.toString());
    const interested = matches.filter((m) => m.isInterested);
    return {
      message: 'Interested jobs retrieved successfully',
      matches: interested,
    };
  }

  @Post('batch')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Batch match multiple jobs' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        jobIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of job IDs to match',
        },
      },
      required: ['jobIds'],
    },
  })
  @ApiResponse({ status: 200, description: 'Batch matching completed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async batchMatch(@Body('jobIds') jobIds: string[], @Request() req) {
    this.logger.log(`🔄 Batch matching ${jobIds.length} jobs for user ${req.user?.email || 'unknown'}`);
    const matches = await this.matchingService.batchMatch(req.user._id.toString(), jobIds);
    this.logger.log(`✅ Batch matched ${matches.length} jobs`);
    return {
      message: 'Batch matching completed',
      matches,
    };
  }

  @Post('cover-letter/:jobId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Generate cover letter for a job' })
  @ApiParam({ name: 'jobId', description: 'Job ID to generate cover letter for' })
  @ApiResponse({ status: 200, description: 'Cover letter generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateCoverLetter(@Param('jobId') jobId: string, @Request() req) {
    const coverLetter = await this.matchingService.generateCoverLetter(
      req.user._id.toString(),
      jobId,
    );
    return {
      message: 'Cover letter generated successfully',
      coverLetter,
    };
  }


  @Patch('interest/:jobId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark job as interested or not interested' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isInterested: {
          type: 'boolean',
          description: 'Whether user is interested in the job',
        },
      },
      required: ['isInterested'],
    },
  })
  @ApiResponse({ status: 200, description: 'Interest status updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markInterested(
    @Param('jobId') jobId: string,
    @Body('isInterested') isInterested: boolean,
    @Request() req,
  ) {
    const match = await this.matchingService.markInterested(
      req.user._id.toString(),
      jobId,
      isInterested,
    );
    return {
      message: 'Interest status updated',
      match,
    };
  }

  @Post('express-interest')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Express interest in multiple jobs (bulk operation)',
    description: 'Bulk express interest: interested, not_interested, or not_a_match. Based on package limits. Automatically assigns agents for interested jobs.',
  })
  @ApiBody({ type: ExpressInterestDto })
  @ApiResponse({ status: 200, description: 'Interest expressed successfully' })
  @ApiResponse({ status: 400, description: 'Package limit exceeded or invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async expressInterest(@Body() expressInterestDto: ExpressInterestDto, @Request() req) {
    const userId = req.user._id.toString();

    // Check package limits for bulk operations
    const canPerform = await this.agentAssignmentService.canPerformBulkOperation(
      userId,
      expressInterestDto.matchIds.length,
    );

    if (!canPerform.allowed) {
      throw new BadRequestException(canPerform.reason || 'Bulk operation not allowed');
    }

    // Update interest status
    const result = await this.matchingService.expressInterest(
      userId,
      expressInterestDto.matchIds,
      expressInterestDto.status,
    );

    // If interested, assign agents
    let agentAssignment = null;
    if (expressInterestDto.status === InterestStatus.INTERESTED) {
      agentAssignment = await this.agentAssignmentService.assignAgentToMatches(
        userId,
        expressInterestDto.matchIds,
      );
    }

    return {
      message: 'Interest expressed successfully',
      updated: result.updated,
      matches: result.matches,
      agentAssignment,
    };
  }
}

