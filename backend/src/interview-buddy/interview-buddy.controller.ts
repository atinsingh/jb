import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
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

@ApiTags('interview-buddy')
@Controller('interview-buddy')
@UseGuards(JwtAuthGuard)
export class InterviewBuddyController {
  constructor(private readonly interviewBuddyService: InterviewBuddyService) {}

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

