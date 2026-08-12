import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
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
import { AutopilotRulesService } from './autopilot-rules.service';
import { EmployerAiActionsService } from './employer-ai-actions.service';
import { ToggleAutopilotDto } from './dto/toggle-autopilot.dto';
import { ScreenDto } from './dto/screen.dto';
import { CopilotDto } from './dto/copilot.dto';
import { SourcingDto } from './dto/sourcing.dto';
import { ScorecardDto } from './dto/scorecard.dto';
import { DecideProposedActionDto } from './dto/decide-proposed-action.dto';

@ApiTags('employer-ai')
@Controller('employer/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')
export class AiRecruiterController {
  constructor(
    private readonly aiRecruiterService: AiRecruiterService,
    private readonly autopilotRulesService: AutopilotRulesService,
    private readonly actionsService: EmployerAiActionsService,
  ) {}

  @Get('autopilot')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get autopilot state, stats, rules, queue and activity' })
  @ApiResponse({ status: 200, description: 'Autopilot snapshot' })
  async getAutopilot(@Request() req) {
    const employerId = req.user._id.toString();
    const result = await this.aiRecruiterService.getAutopilot(employerId);
    const pending = await this.actionsService.list(employerId, 'pending' as any);
    const byApplicantId = new Map(
      pending.map((p: any) => [p.applicantId.toString(), p._id.toString()]),
    );
    const queue = (result.queue || []).map((item: any) => {
      const proposalId = byApplicantId.get(item.applicantId);
      return proposalId ? { ...item, proposalId } : item;
    });
    return { ...result, queue };
  }

  @Post('autopilot/run-now')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Immediately sweep the applicant pool for Autopilot rule matches' })
  @ApiResponse({ status: 201, description: 'Sweep summary' })
  async runNow(@Request() req) {
    const employerId = req.user._id.toString();
    return this.autopilotRulesService.sweepAll(employerId);
  }

  @Get('proposed-actions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List proposed Autopilot actions, optionally filtered by status' })
  @ApiResponse({ status: 200, description: 'Proposed actions' })
  async listProposedActions(@Query('status') status: string, @Request() req) {
    const employerId = req.user._id.toString();
    return this.actionsService.list(employerId, status as any);
  }

  @Post('proposed-actions/:id/decide')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Approve or reject a proposed Autopilot action' })
  @ApiResponse({ status: 201, description: 'Decided proposed action' })
  async decideProposedAction(
    @Param('id') id: string,
    @Body() dto: DecideProposedActionDto,
    @Request() req,
  ) {
    const employerId = req.user._id.toString();
    return this.actionsService.decide(employerId, id, dto.decision, employerId);
  }

  @Post('autopilot/toggle')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Enable or disable recruiting autopilot' })
  @ApiResponse({ status: 201, description: 'Autopilot toggled' })
  async toggleAutopilot(@Body() dto: ToggleAutopilotDto, @Request() req) {
    const employerId = req.user._id.toString();
    return this.aiRecruiterService.toggleAutopilot(employerId, dto.enabled);
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
