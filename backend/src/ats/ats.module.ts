import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ResumeHarnessModule } from '../resume-harness/resume-harness.module';
import { ResumeHarnessSession, ResumeHarnessSessionSchema } from '../resume-harness/schemas/resume-harness-session.schema';
import { AtsSessionController } from './ats-session.controller';
import { AtsSessionService } from './ats-session.service';
import { InSandboxResumeMatcherAdapter, ResumeMatcherAdapter } from './resume-matcher.adapter';
import { AtsSession, AtsSessionSchema } from './schemas/ats-session.schema';
import { AtsMatchService } from './ats-match.service';
import { AtsParseabilityService } from './ats-parseability.service';

@Module({
  imports: [
    ResumeHarnessModule,
    MongooseModule.forFeature([
      { name: AtsSession.name, schema: AtsSessionSchema },
      { name: ResumeHarnessSession.name, schema: ResumeHarnessSessionSchema },
    ]),
  ],
  controllers: [AtsSessionController],
  providers: [
    AtsParseabilityService,
    AtsMatchService,
    AtsSessionService,
    { provide: ResumeMatcherAdapter, useClass: InSandboxResumeMatcherAdapter },
  ],
  exports: [AtsParseabilityService, AtsMatchService, AtsSessionService],
})
export class AtsModule {}
