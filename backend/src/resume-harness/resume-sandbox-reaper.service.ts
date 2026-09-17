import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model, Types } from 'mongoose';
import { SandboxService } from './sandbox/sandbox.service';
import { ResumeHarnessService } from './resume-harness.service';
import {
  ResumeHarnessSession,
  ResumeHarnessSessionDocument,
} from './schemas/resume-harness-session.schema';

@Injectable()
export class ResumeSandboxReaperService {
  private readonly logger = new Logger(ResumeSandboxReaperService.name);

  constructor(
    @InjectModel(ResumeHarnessSession.name)
    private readonly sessionModel: Model<ResumeHarnessSessionDocument>,
    private readonly sandbox: SandboxService,
    private readonly harness: ResumeHarnessService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'resume-sandbox-reaper',
    timeZone: 'UTC',
  })
  async handleSweep(): Promise<void> {
    try {
      await this.sweepExpiredSandboxes();
      await this.harness.reapIdleSessions();
    } catch (error: any) {
      this.logger.warn(
        `Resume sandbox sweep failed: ${error?.message ?? String(error)}`,
      );
    }
  }

  async sweepExpiredSandboxes(): Promise<number> {
    const reaped = await this.sandbox.sweepExpired();
    const sessionIds = [
      ...new Set(
        reaped
          .map(({ sessionId }) => sessionId)
          .filter(
            (sessionId): sessionId is string =>
              sessionId !== undefined && Types.ObjectId.isValid(sessionId),
          ),
      ),
    ];
    if (!sessionIds.length) return 0;

    const endedAt = new Date();
    const result = await this.sessionModel.updateMany(
      { _id: { $in: sessionIds }, status: 'active' },
      {
        $set: { status: 'ended', endedAt },
        $unset: { sandboxId: 1 },
      },
    );
    return result.modifiedCount || 0;
  }
}
