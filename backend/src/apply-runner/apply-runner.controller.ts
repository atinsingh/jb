import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Request,
  Optional,
  UseGuards,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApplyRunnerService } from './apply-runner.service';
import { ApprovalQueueService } from './approval-queue.service';
import { QUEUE_ATS, JOB_ATS_SUBMIT } from '../queue/queue.constants';

@ApiTags('apply-runner')
@Controller('apply-runner')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ApplyRunnerController {
  constructor(
    private readonly runner: ApplyRunnerService,
    private readonly approvals: ApprovalQueueService,
    // Producer: when QUEUE_ENABLED=true the queue is registered and injected;
    // otherwise `@Optional()` yields undefined and we run inline (dev default).
    @Optional() @InjectQueue(QUEUE_ATS) private readonly queue?: Queue,
  ) {}

  // ==================== Approval queue (candidate-facing) ================

  @Get('queue')
  @ApiOperation({ summary: 'Applications prepared and awaiting your approval' })
  async queueList(@Request() req) {
    const items = await this.approvals.list(req.user._id.toString());
    return {
      items,
      total: items.length,
      clean: items.filter((i) => i.isClean).length,
      needsYou: items.filter((i) => i.blockers.length > 0).length,
    };
  }

  @Post('queue/:id/answer')
  @ApiOperation({ summary: 'Answer a question only you can answer; we remember it' })
  @ApiParam({ name: 'id', description: 'Application id' })
  async answerBlocker(
    @Param('id') id: string,
    @Body() body: { questionKey: string; value: any; profileField?: string; country?: string },
    @Request() req,
  ) {
    return this.approvals.answerBlocker(req.user._id.toString(), id, body);
  }

  @Post('queue/:id/approve')
  @ApiOperation({ summary: 'Approve this application for submission' })
  @ApiParam({ name: 'id', description: 'Application id' })
  async approve(@Param('id') id: string, @Request() req) {
    return this.approvals.approve(req.user._id.toString(), id);
  }

  @Post('queue/approve-clean')
  @ApiOperation({ summary: 'Approve every application with no outstanding questions' })
  async approveClean(@Request() req) {
    return this.approvals.approveClean(req.user._id.toString());
  }

  @Post('queue/:id/decline')
  @ApiOperation({ summary: 'Skip this role — do not submit it' })
  @ApiParam({ name: 'id', description: 'Application id' })
  async decline(@Param('id') id: string, @Body('reason') reason: string, @Request() req) {
    return this.approvals.decline(req.user._id.toString(), id, reason);
  }

  @Post('commit')
  @ApiOperation({ summary: 'Submit applications the candidate has already approved' })
  async commit(@Body('limit') limit = 10) {
    // No-op unless AUTO_APPLICATION_ENABLED is on — the gate lives in the runner
    // so every entry point inherits it.
    return this.runner.commitApproved(limit || 10);
  }

  @Post('process')
  @ApiOperation({ summary: 'Process pending auto-applied applications (ATS runner)' })
  async process(@Body('limit') limit = 10) {
    const effectiveLimit = limit || 10;
    if (this.queue) {
      const job = await this.queue.add(JOB_ATS_SUBMIT, { limit: effectiveLimit });
      return { message: 'Enqueued', queued: true, jobId: job.id };
    }
    const result = await this.runner.process(effectiveLimit);
    return { message: 'Processing complete', queued: false, result };
  }
}
