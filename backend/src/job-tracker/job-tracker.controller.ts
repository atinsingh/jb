import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JobIngestionService, JobIngestionInput } from './job-ingestion.service';
import { JobTrackerService, TrackerFilters, ApplicationStatusUpdate } from './job-tracker.service';
import { AssistedApplyService } from './assisted-apply.service';
import { InterviewPrepService } from './interview-prep.service';
import { StoryBankService } from './story-bank.service';
import { RemindersService } from './reminders.service';
import { AnalyticsService } from './analytics.service';
import { MockInterviewStatus } from '../schemas/mock-interview-session.schema';
import { ReminderType, ReminderStatus } from '../schemas/reminder.schema';
import { STAREntry } from '../schemas/story-bank.schema';

@ApiTags('job-tracker')
@Controller('job-tracker')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class JobTrackerController {
  constructor(
    private readonly jobIngestionService: JobIngestionService,
    private readonly jobTrackerService: JobTrackerService,
    private readonly assistedApplyService: AssistedApplyService,
    private readonly interviewPrepService: InterviewPrepService,
    private readonly storyBankService: StoryBankService,
    private readonly remindersService: RemindersService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  // ==================== Job Ingestion ====================

  @Post('jobs/ingest')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Ingest job from URL and/or job description' })
  async ingestJob(@Body() input: JobIngestionInput, @Request() req) {
    return this.jobIngestionService.ingestJob(req.user._id.toString(), input);
  }

  // ==================== Application Tracker ====================

  @Get('applications')
  @ApiOperation({ summary: 'Get all applications with filters' })
  @ApiQuery({ name: 'status', required: false, isArray: true })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'companyName', required: false })
  @ApiQuery({ name: 'jobType', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getApplications(@Query() filters: TrackerFilters, @Request() req) {
    return this.jobTrackerService.getApplications(req.user._id.toString(), filters);
  }

  @Get('applications/stats')
  @ApiOperation({ summary: 'Get application statistics' })
  async getApplicationStats(@Request() req) {
    return this.jobTrackerService.getApplicationStats(req.user._id.toString());
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get application by ID' })
  async getApplication(@Param('id') id: string, @Request() req) {
    return this.jobTrackerService.getApplication(id, req.user._id.toString());
  }

  @Patch('applications/:id/status')
  @ApiOperation({ summary: 'Update application status' })
  async updateApplicationStatus(
    @Param('id') id: string,
    @Body() update: ApplicationStatusUpdate,
    @Request() req,
  ) {
    return this.jobTrackerService.updateApplicationStatus(
      id,
      req.user._id.toString(),
      update,
    );
  }

  @Get('applications/:id/timeline')
  @ApiOperation({ summary: 'Get application status timeline' })
  async getStatusTimeline(@Param('id') id: string, @Request() req) {
    return this.jobTrackerService.getStatusTimeline(id, req.user._id.toString());
  }

  // ==================== Assisted Apply ====================

  @Post('applications/:applicationId/answers-pack/generate')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Generate answers pack for application' })
  async generateAnswersPack(
    @Param('applicationId') applicationId: string,
    @Body() body: { jobId: string; customQuestions?: string[] },
    @Request() req,
  ) {
    return this.assistedApplyService.generateAnswersPack(
      req.user._id.toString(),
      body.jobId,
      applicationId,
      body.customQuestions,
    );
  }

  @Get('applications/:applicationId/answers-pack')
  @ApiOperation({ summary: 'Get answers pack for application' })
  async getAnswersPack(@Param('applicationId') applicationId: string, @Request() req) {
    return this.assistedApplyService.getAnswersPack(applicationId, req.user._id.toString());
  }

  @Put('applications/:applicationId/answers-pack')
  @ApiOperation({ summary: 'Update answers pack' })
  async updateAnswersPack(
    @Param('applicationId') applicationId: string,
    @Body() answersPack: any,
    @Request() req,
  ) {
    return this.assistedApplyService.updateAnswersPack(
      applicationId,
      req.user._id.toString(),
      answersPack,
    );
  }

  // ==================== Interview Prep ====================

  @Post('interview-sessions')
  @ApiOperation({ summary: 'Create new interview session' })
  async createInterviewSession(
    @Body() body: { jobId?: string; applicationId?: string; title?: string },
    @Request() req,
  ) {
    return this.interviewPrepService.createInterviewSession(
      req.user._id.toString(),
      body.jobId,
      body.applicationId,
      body.title,
    );
  }

  @Get('interview-sessions')
  @ApiOperation({ summary: 'Get interview sessions' })
  @ApiQuery({ name: 'status', required: false, enum: MockInterviewStatus })
  async getInterviewSessions(
    @Query('status') status: MockInterviewStatus,
    @Request() req,
  ) {
    return this.interviewPrepService.getInterviewSessions(
      req.user._id.toString(),
      status,
    );
  }

  @Get('interview-sessions/:id')
  @ApiOperation({ summary: 'Get interview session by ID' })
  async getInterviewSession(@Param('id') id: string, @Request() req) {
    return this.interviewPrepService.getInterviewSession(id, req.user._id.toString());
  }

  @Post('interview-sessions/:id/generate-question')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Generate next interview question' })
  async generateQuestion(@Param('id') id: string, @Request() req) {
    return this.interviewPrepService.generateNextQuestion(id, req.user._id.toString());
  }

  @Post('interview-sessions/:id/submit-answer')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Submit answer and get feedback' })
  async submitAnswer(
    @Param('id') id: string,
    @Body() body: { question: string; answer: string },
    @Request() req,
  ) {
    return this.interviewPrepService.submitAnswer(
      id,
      req.user._id.toString(),
      body.question,
      body.answer,
    );
  }

  @Post('interview-sessions/:id/complete')
  @ApiOperation({ summary: 'Complete interview session' })
  async completeInterviewSession(@Param('id') id: string, @Request() req) {
    return this.interviewPrepService.completeInterviewSession(id, req.user._id.toString());
  }

  // ==================== Story Bank ====================

  @Post('story-bank')
  @ApiOperation({ summary: 'Create new story entry' })
  async createStory(
    @Body()
    body: {
      title: string;
      description?: string;
      star: STAREntry;
      competencies: string[];
      skills: string[];
      tags?: string[];
    },
    @Request() req,
  ) {
    return this.storyBankService.createStory(req.user._id.toString(), body);
  }

  @Get('story-bank')
  @ApiOperation({ summary: 'Get story bank entries' })
  @ApiQuery({ name: 'competencies', required: false, isArray: true })
  @ApiQuery({ name: 'skills', required: false, isArray: true })
  @ApiQuery({ name: 'isFavorite', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getStories(@Query() filters: any, @Request() req) {
    return this.storyBankService.getStories(req.user._id.toString(), filters);
  }

  @Get('story-bank/:id')
  @ApiOperation({ summary: 'Get story by ID' })
  async getStory(@Param('id') id: string, @Request() req) {
    return this.storyBankService.getStory(id, req.user._id.toString());
  }

  @Put('story-bank/:id')
  @ApiOperation({ summary: 'Update story' })
  async updateStory(@Param('id') id: string, @Body() updates: any, @Request() req) {
    return this.storyBankService.updateStory(id, req.user._id.toString(), updates);
  }

  @Delete('story-bank/:id')
  @ApiOperation({ summary: 'Delete story' })
  async deleteStory(@Param('id') id: string, @Request() req) {
    return this.storyBankService.deleteStory(id, req.user._id.toString());
  }

  @Get('story-bank/competencies')
  @ApiOperation({ summary: 'Get all user competencies' })
  async getUserCompetencies(@Request() req) {
    return this.storyBankService.getUserCompetencies(req.user._id.toString());
  }

  @Get('story-bank/skills')
  @ApiOperation({ summary: 'Get all user skills' })
  async getUserSkills(@Request() req) {
    return this.storyBankService.getUserSkills(req.user._id.toString());
  }

  // ==================== Reminders ====================

  @Post('reminders')
  @ApiOperation({ summary: 'Create reminder' })
  async createReminder(@Body() body: any, @Request() req) {
    return this.remindersService.createReminder(req.user._id.toString(), body);
  }

  @Get('reminders')
  @ApiOperation({ summary: 'Get reminders' })
  @ApiQuery({ name: 'status', required: false, enum: ReminderStatus })
  @ApiQuery({ name: 'type', required: false, enum: ReminderType })
  async getReminders(@Query() filters: any, @Request() req) {
    return this.remindersService.getReminders(req.user._id.toString(), filters);
  }

  @Patch('reminders/:id/status')
  @ApiOperation({ summary: 'Update reminder status' })
  async updateReminderStatus(
    @Param('id') id: string,
    @Body() body: { status: ReminderStatus },
    @Request() req,
  ) {
    return this.remindersService.updateReminderStatus(
      id,
      req.user._id.toString(),
      body.status,
    );
  }

  // ==================== Analytics ====================

  @Get('analytics')
  @ApiOperation({ summary: 'Get user analytics' })
  @ApiQuery({ name: 'period', required: false })
  async getAnalytics(@Query('period') period: string, @Request() req) {
    return this.analyticsService.generateUserAnalytics(req.user._id.toString(), period);
  }
}

