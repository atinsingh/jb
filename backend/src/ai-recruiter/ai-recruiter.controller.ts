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
import { AgentRuntimeService } from '../agent-runtime/agent-runtime.service';
import { RECRUITER_COPILOT_TYPE } from './copilot/recruiter-copilot.definition';
import { extractCopilotReply } from './copilot/extract-copilot-reply';
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
    private readonly agentRuntime: AgentRuntimeService,
  ) {}

  /**
   * Honest, human-readable label for what approving a REAL proposal will
   * actually do. The frontend derives its queue-card icon by substring
   * matching this string (`includes('reject')` / `includes('message')`), so
   * the wording here is load-bearing, not cosmetic.
   */
  private proposalActionLabel(proposal: any): string {
    switch (proposal?.actionType) {
      case 'reject':
        return 'Reject applicant';
      case 'advance_stage':
        return `Advance to ${proposal?.payload?.targetStage || 'next stage'}`;
      case 'schedule_interview':
        return 'Schedule interview';
      case 'send_message':
        return 'Send outreach message';
      default:
        return String(proposal?.actionType || 'review');
    }
  }

  @Get('autopilot')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get autopilot state, stats, rules, queue and activity' })
  @ApiResponse({ status: 200, description: 'Autopilot snapshot' })
  async getAutopilot(@Request() req) {
    const employerId = req.user._id.toString();
    const result = await this.aiRecruiterService.getAutopilot(employerId);
    const pending = await this.actionsService.list(employerId, 'pending' as any);

    // Only Autopilot-created proposals may attach to the Autopilot queue —
    // a Copilot proposal must never be approvable under an Autopilot card.
    // `list()` sorts newest-first, so the FIRST occurrence per applicant is
    // the newest; later (older) entries must not overwrite it.
    const byApplicantId = new Map<string, any>();
    for (const p of pending as any[]) {
      if (p?.source !== 'autopilot') continue;
      const key = p.applicantId?.toString();
      if (!key || byApplicantId.has(key)) continue;
      byApplicantId.set(key, p);
    }

    const queue = (result.queue || []).map((item: any) => {
      const proposal = byApplicantId.get(item.applicantId);
      if (!proposal) return item;
      // The card must show what Approve will REALLY execute, not the
      // deterministic preview heuristic's independent guess.
      return {
        ...item,
        proposalId: proposal._id.toString(),
        proposedAction: this.proposalActionLabel(proposal),
        rationale: proposal.rationale || item.rationale,
      };
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
  @ApiOperation({ summary: 'Recruiting copilot — multi-turn tool-use agent' })
  @ApiResponse({ status: 201, description: 'Copilot reply with proposed actions' })
  async copilot(@Body() dto: CopilotDto, @Request() req) {
    const userId = req.user._id.toString();
    const run = await this.agentRuntime.run(RECRUITER_COPILOT_TYPE, userId, {
      message: dto.message,
    });
    return extractCopilotReply(run);
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
