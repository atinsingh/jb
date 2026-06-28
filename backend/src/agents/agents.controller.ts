import {
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  Request,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgentsService } from './agents.service';
import { AgentAssignmentService } from '../applications/agent-assignment.service';
import { ApplicationsService } from '../applications/applications.service';
import { UpdateApplicationDto } from './dto/update-application.dto';

@ApiTags('agents')
@Controller('agents')
@UseGuards(JwtAuthGuard)
export class AgentsController {
  constructor(
    private agentsService: AgentsService,
    private agentAssignmentService: AgentAssignmentService,
    private applicationsService: ApplicationsService,
  ) {}

  @Get('assigned-candidates')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get assigned candidates',
    description: 'Returns all candidates assigned to the authenticated agent.',
  })
  @ApiResponse({ status: 200, description: 'Assigned candidates retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not an agent' })
  async getAssignedCandidates(@Request() req) {
    // Verify user is an agent
    if (req.user.role !== 'ROLE_AGENT') {
      throw new BadRequestException('Only agents can access this endpoint');
    }

    const candidates = await this.agentAssignmentService.getAssignedCandidates(
      req.user._id.toString(),
    );

    return {
      message: 'Assigned candidates retrieved successfully',
      candidates,
      total: candidates.length,
    };
  }

  @Get('assigned-matches')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get assigned job matches',
    description: 'Returns all job matches assigned to the authenticated agent.',
  })
  @ApiResponse({ status: 200, description: 'Assigned matches retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not an agent' })
  async getAssignedMatches(@Request() req) {
    if (req.user.role !== 'ROLE_AGENT') {
      throw new BadRequestException('Only agents can access this endpoint');
    }

    const matches = await this.agentAssignmentService.getAssignedMatches(
      req.user._id.toString(),
    );

    return {
      message: 'Assigned matches retrieved successfully',
      matches,
      total: matches.length,
    };
  }

  @Get('candidate/:candidateId/profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get candidate profile and resume',
    description: 'Get full candidate profile including resume data for assigned candidate.',
  })
  @ApiParam({ name: 'candidateId', description: 'Candidate ID' })
  @ApiResponse({ status: 200, description: 'Candidate profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Candidate not assigned to agent' })
  async getCandidateProfile(@Param('candidateId') candidateId: string, @Request() req) {
    if (req.user.role !== 'ROLE_AGENT') {
      throw new BadRequestException('Only agents can access this endpoint');
    }

    const profile = await this.agentsService.getCandidateProfile(
      candidateId,
      req.user._id.toString(),
    );

    return {
      message: 'Candidate profile retrieved successfully',
      profile,
    };
  }

  @Post('apply/:matchId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Apply to job on behalf of candidate',
    description: 'Agent applies to a job on behalf of an assigned candidate.',
  })
  @ApiParam({ name: 'matchId', description: 'Job match ID' })
  @ApiResponse({ status: 200, description: 'Application created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Match not assigned to agent' })
  async applyOnBehalf(@Param('matchId') matchId: string, @Request() req) {
    if (req.user.role !== 'ROLE_AGENT') {
      throw new BadRequestException('Only agents can access this endpoint');
    }

    const application = await this.agentsService.applyOnBehalf(
      matchId,
      req.user._id.toString(),
    );

    return {
      message: 'Application created successfully',
      application,
    };
  }

  @Patch('application/:applicationId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update application details',
    description: 'Agent updates application status, adds notes, or uploads proof documents.',
  })
  @ApiParam({ name: 'applicationId', description: 'Application ID' })
  @ApiBody({ type: UpdateApplicationDto })
  @ApiResponse({ status: 200, description: 'Application updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Application not assigned to agent' })
  async updateApplication(
    @Param('applicationId') applicationId: string,
    @Body() updateDto: UpdateApplicationDto,
    @Request() req,
  ) {
    if (req.user.role !== 'ROLE_AGENT') {
      throw new BadRequestException('Only agents can access this endpoint');
    }

    const application = await this.agentsService.updateApplication(
      applicationId,
      req.user._id.toString(),
      updateDto,
    );

    return {
      message: 'Application updated successfully',
      application,
    };
  }

  @Post('application/:applicationId/proof')
  @UseInterceptors(FilesInterceptor('proof', 5))
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload proof documents for application',
    description: 'Upload screenshots, confirmation emails, or other proof documents.',
  })
  @ApiParam({ name: 'applicationId', description: 'Application ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        proof: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Proof documents (images, PDFs)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Proof documents uploaded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Application not assigned to agent' })
  async uploadProof(
    @Param('applicationId') applicationId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    if (req.user.role !== 'ROLE_AGENT') {
      throw new BadRequestException('Only agents can access this endpoint');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const application = await this.agentsService.uploadProof(
      applicationId,
      req.user._id.toString(),
      files,
    );

    return {
      message: 'Proof documents uploaded successfully',
      application,
    };
  }
}

