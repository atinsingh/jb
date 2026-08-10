import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AgentRuntimeService } from '../agent-runtime/agent-runtime.service';
import { AgentRun, AgentRunDocument } from '../agent-runtime/schemas/agent-run.schema';
import { UsersService } from '../users/users.service';
import { UserPreferencesService } from '../users/user-preferences.service';
import { JOB_SEARCH_COPILOT_TYPE } from './copilot.definition';

/**
 * Candidate Job-Search Copilot API. Kicks off agent runs (queued when the
 * background queue is enabled, else inline) and exposes read-only run history
 * scoped strictly to the calling user.
 */
@ApiTags('copilot')
@ApiBearerAuth('JWT-auth')
@Controller('copilot')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_CANDIDATE', 'ROLE_ADMIN')
export class CopilotController {
  private readonly logger = new Logger(CopilotController.name);

  constructor(
    private readonly runtime: AgentRuntimeService,
    private readonly users: UsersService,
    private readonly userPreferences: UserPreferencesService,
    @InjectModel(AgentRun.name)
    private readonly agentRunModel: Model<AgentRunDocument>,
  ) {}

  @Post('run')
  @ApiOperation({ summary: 'Start a Job-Search Copilot run for the candidate.' })
  async run(@Request() req, @Body() body: { goal?: string; keywords?: string } = {}) {
    const userId = req.user._id.toString();

    // Seed candidate context so the agent's system prompt has something to work
    // with (name/skills/location/preferences). Best-effort — a missing profile
    // must not block the run.
    const [autofill, prefs] = await Promise.all([
      this.users.getAutofillPayload(userId).catch(() => null),
      this.userPreferences.getOrCreate(userId).catch(() => null),
    ]);
    const p: any = prefs || {};

    const input = {
      goal:
        body.goal ||
        'Find strong, auto-apply-safe job matches and apply to them on my behalf, then summarise.',
      keywords: body.keywords,
      candidate: {
        name: autofill?.fullName,
        email: autofill?.email,
        location: autofill?.location,
        skills: p.skills || [],
        titles: p.titles || [],
      },
      preferences: {
        remoteOnly: p.remoteOnly,
        workplaceTypes: p.workplaceTypes,
        employmentTypes: p.employmentTypes,
        minMatchScore: p.minMatchScore,
        autoApplyMinScore: p.autoApplyMinScore,
        autoApply: p.autoApply,
      },
    };

    const res = await this.runtime.enqueueRun(JOB_SEARCH_COPILOT_TYPE, userId, input);
    if (res.queued === true) {
      return { runId: res.runId, queued: true };
    }
    return { runId: String(res.run._id), queued: false, status: res.run.status };
  }

  @Get('runs')
  @ApiOperation({ summary: 'List this candidate\'s Job-Search Copilot runs (newest first).' })
  async listRuns(@Request() req) {
    const userId = req.user._id.toString();
    const runs = await this.agentRunModel
      .find({ userId: new Types.ObjectId(userId), agentType: JOB_SEARCH_COPILOT_TYPE })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return { runs, total: runs.length };
  }

  @Get('runs/:id')
  @ApiOperation({ summary: 'Get one Job-Search Copilot run (must belong to the caller).' })
  async getRun(@Request() req, @Param('id') id: string) {
    const userId = req.user._id.toString();
    const run = Types.ObjectId.isValid(id)
      ? await this.agentRunModel.findById(id).lean()
      : null;
    if (!run || String((run as any).userId) !== userId) {
      throw new NotFoundException('Run not found');
    }
    return run;
  }
}
