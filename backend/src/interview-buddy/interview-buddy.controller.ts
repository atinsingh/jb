import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InterviewBuddyService } from './interview-buddy.service';
import {
  CreateInterviewSessionDto,
  AcknowledgeConsentDto,
} from './dto/session-lifecycle.dto';

@ApiTags('interview-buddy')
@Controller('interview-buddy')
@UseGuards(JwtAuthGuard)
export class InterviewBuddyController {
  constructor(private readonly interviewBuddyService: InterviewBuddyService) {}

  // ---- Session lifecycle -------------------------------------------------
  // The module's README has documented these since it shipped; they were never
  // added, so the richer interview engine (context packs, coaching, scoring,
  // the audio gateway) had no way to be driven.

  @Post('sessions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create an interview session and build its context pack' })
  @ApiResponse({ status: 201, description: 'Session created' })
  async createSession(@Body() dto: CreateInterviewSessionDto, @Request() req) {
    const { session } = await this.interviewBuddyService.createSession(
      req.user._id.toString(),
      dto,
    );
    return {
      id: String(session._id),
      mode: session.mode,
      status: session.status,
      roleTitle: session.roleTitle,
      companyName: session.companyName,
      captureMode: (session as any).captureMode,
      consentAcknowledged: !!(session as any).consentAcknowledgedAt,
      retainTranscript: !!(session as any).retainTranscript,
    };
  }

  @Post('sessions/:id/consent')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Acknowledge consent for live capture, and choose transcript retention',
  })
  @ApiResponse({ status: 200, description: 'Consent recorded' })
  @ApiResponse({ status: 400, description: 'Acknowledgement withheld — capture stays disabled' })
  async acknowledgeConsent(
    @Param('id') id: string,
    @Body() dto: AcknowledgeConsentDto,
    @Request() req,
  ) {
    return this.interviewBuddyService.acknowledgeConsent(id, req.user._id.toString(), dto);
  }

  @Post('sessions/:id/start')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark a session in progress' })
  async startSession(@Param('id') id: string, @Request() req) {
    return this.interviewBuddyService.startSession(id, req.user._id.toString());
  }

  @Post('sessions/:id/complete')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'End a session; discards the transcript unless retention was opted into',
  })
  async completeSession(@Param('id') id: string, @Request() req) {
    return this.interviewBuddyService.completeSession(id, req.user._id.toString());
  }

  @Get('sessions/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Fetch a session' })
  @ApiResponse({ status: 404, description: 'Not found, or not yours' })
  async getSession(@Param('id') id: string, @Request() req) {
    const found = await this.interviewBuddyService.getSession(id, req.user._id.toString());
    if (!found) throw new NotFoundException('Interview session not found');

    const s: any = found.session;
    return {
      id: String(s._id),
      mode: s.mode,
      status: s.status,
      roleTitle: s.roleTitle,
      companyName: s.companyName,
      captureMode: s.captureMode,
      consentAcknowledged: !!s.consentAcknowledgedAt,
      retainTranscript: !!s.retainTranscript,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
    };
  }

  @Get('applications')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user applications for interview prep' })
  @ApiResponse({ status: 200, description: 'Applications retrieved successfully' })
  async getApplications(@Request() req) {
    const userId = req.user._id.toString();
    const applications = await this.interviewBuddyService.getApplicationsForUser(userId);
    return {
      message: 'Applications retrieved successfully',
      applications,
    };
  }

  @Get('resumes')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user resumes for interview prep' })
  @ApiResponse({ status: 200, description: 'Resumes retrieved successfully' })
  async getResumes(@Request() req) {
    const userId = req.user._id.toString();
    const resumes = await this.interviewBuddyService.getResumesForUser(userId);
    return {
      message: 'Resumes retrieved successfully',
      resumes,
    };
  }

  @Post('chat')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Send a message to interview buddy' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'User message' },
        applicationId: { type: 'string', description: 'Optional application ID for context' },
        resumeId: { type: 'string', description: 'Optional resume ID for context' },
        conversationHistory: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string' },
              content: { type: 'string' },
            },
          },
          description: 'Previous conversation messages',
        },
      },
      required: ['message'],
    },
  })
  @ApiResponse({ status: 200, description: 'Response generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async chat(
    @Body()
    body: {
      message: string;
      applicationId?: string;
      resumeId?: string;
      conversationHistory?: Array<{ role: string; content: string }>;
    },
    @Request() req,
  ) {
    const userId = req.user._id.toString();
    const response = await this.interviewBuddyService.chat(
      userId,
      body.message,
      body.applicationId,
      body.resumeId,
      body.conversationHistory || [],
    );

    return {
      message: 'Response generated successfully',
      response,
    };
  }
}

