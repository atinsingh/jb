import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { InterviewBuddyController } from './interview-buddy.controller';
import { InterviewBuddyService } from './interview-buddy.service';
import { Application, ApplicationSchema } from '../schemas/application.schema';
import { Resume, ResumeSchema } from '../schemas/resume.schema';
import { Job, JobSchema } from '../schemas/job.schema';
import { InterviewSession, InterviewSessionSchema } from '../schemas/interview-session.schema';
import { InterviewTurn, InterviewTurnSchema } from '../schemas/interview-turn.schema';
import { PromptVersion, PromptVersionSchema } from '../schemas/prompt-version.schema';
import { LLMModule } from '../llm/llm.module';
import { CoachingService } from './services/coaching.service';
import { SessionContextBuilderService } from './services/session-context-builder.service';
import { TurnDetectorService } from './services/turn-detector.service';
import { LiveSessionService } from './services/live-session.service';
import { STREAMING_STT_PROVIDER } from './interfaces/streaming-stt.interface';
import { createStreamingSttProvider } from './providers/streaming-stt.factory';

/**
 * Interview Buddy.
 *
 * Note what was previously missing: this module registered only
 * `InterviewBuddyService`, so the coaching service, the context builder and the
 * audio gateway existed as source files that Nest never instantiated. That is
 * why nothing consumed them. They are wired here.
 *
 * The streaming STT provider is chosen by factory at boot and defaults to
 * "unconfigured", so a deployment without a vendor key degrades loudly rather
 * than appearing to transcribe.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema },
      { name: Resume.name, schema: ResumeSchema },
      { name: Job.name, schema: JobSchema },
      { name: InterviewSession.name, schema: InterviewSessionSchema },
      { name: InterviewTurn.name, schema: InterviewTurnSchema },
      { name: PromptVersion.name, schema: PromptVersionSchema },
    ]),
    LLMModule,
    JwtModule.register({}),
  ],
  controllers: [InterviewBuddyController],
  providers: [
    InterviewBuddyService,
    CoachingService,
    SessionContextBuilderService,
    TurnDetectorService,
    LiveSessionService,
    {
      provide: STREAMING_STT_PROVIDER,
      useFactory: createStreamingSttProvider,
    },
  ],
  exports: [InterviewBuddyService, LiveSessionService],
})
export class InterviewBuddyModule {}
