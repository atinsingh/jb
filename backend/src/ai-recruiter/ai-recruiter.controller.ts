import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AiRecruiterService } from './ai-recruiter.service';
import { ToggleAutopilotDto } from './dto/toggle-autopilot.dto';
import { ScreenDto } from './dto/screen.dto';
import { CopilotDto } from './dto/copilot.dto';
import { SourcingDto } from './dto/sourcing.dto';
import { ScorecardDto } from './dto/scorecard.dto';

@ApiTags('employer-ai')
@Controller('employer/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')
export class AiRecruiterController {
  constructor(private readonly aiRecruiterService: AiRecruiterService) {}

  @Get('autopilot')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get autopilot state, stats, rules, queue and activity' })
  @ApiResponse({ status: 200, description: 'Autopilot snapshot' })
  async getAutopilot(@Request() req) {
    const employerId = req.user._id.toString();
    return this.aiRecruiterService.getAutopilot(employerId);
  }

  @Post('autopilot/toggle')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Enable or disable recruiting autopilot' })
  @ApiResponse({ status: 201, description: 'Autopilot toggled' })
  async toggleAutopilot(@Body() dto: ToggleAutopilotDto, @Request() req) {
    return this.aiRecruiterService.toggleAutopilot(dto.enabled);
  }

  @Post('screen')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Heuristically screen and rank applicants for a job' })
  @ApiResponse({ status: 201, description: 'Ranked applicant list with rationale' })
  async screen(@Body() dto: ScreenDto, @Request() req) {
    const employerId = req.user._id.toString();
    return this.aiRecruiterService.screen(employerId, dto.jobId);
  }

  @Post('copilot')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Recruiting copilot — templated structured action response' })
  @ApiResponse({ status: 201, description: 'Copilot reply with proposed actions' })
  async copilot(@Body() dto: CopilotDto, @Request() req) {
    const userId = req.user._id.toString();
    return this.aiRecruiterService.copilot(userId, dto.message);
  }

  @Post('sourcing')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Rank your real candidate pool against a brief, with drafted outreach' })
  @ApiResponse({ status: 201, description: 'Ranked candidates with outreach drafts' })
  async sourcing(@Body() dto: SourcingDto, @Request() req) {
    const employerId = req.user._id.toString();
    return this.aiRecruiterService.sourcing(dto.brief, employerId);
  }

  @Post('interview/scorecard')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Generate a templated interview scorecard from transcript/notes' })
  @ApiResponse({ status: 201, description: 'Structured scorecard' })
  async scorecard(@Body() dto: ScorecardDto, @Request() req) {
    const userId = req.user._id.toString();
    return this.aiRecruiterService.scorecard(userId, dto.transcript, dto.notes);
  }
}
