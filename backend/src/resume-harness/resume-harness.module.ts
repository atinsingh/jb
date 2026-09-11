import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ResumeHarnessController } from './resume-harness.controller';
import { ResumeHarnessService } from './resume-harness.service';
import { ModelAliasService } from './model-alias.service';
import { CandidateContextService } from './candidate-context.service';
import { ContextFilesService } from './context-files.service';
import { ResumeTemplateService } from './resume-template.service';
import { HarnessRegistry } from './harness/harness.registry';
import { SandboxService } from './sandbox/sandbox.service';
import { AgentPlatformClient } from './sandbox/agent-platform.client';
import { DockerSandboxDriver } from './sandbox/docker-sandbox.driver';
import {
  SandboxDriver,
  SANDBOX_DRIVER,
} from './sandbox/sandbox-driver.interface';
import { SANDBOX_WORKDIR } from './sandbox/sandbox.service';

/**
 * Which sandbox backend runs the harnesses.
 *
 * `docker` is the default and the one that actually works: it drives the local
 * Docker daemon, which this repo already depends on. `agent-platform` targets a
 * self-hosted LiteLLM Agent Platform — kept because the ticket specifies it,
 * but it publishes no image and no documented sandbox API, so its client is
 * written against an inferred surface and is unverified.
 *
 * Select with RESUME_SANDBOX_DRIVER=docker|agent-platform.
 */
function sandboxDriverFactory(): SandboxDriver {
  const choice = (process.env.RESUME_SANDBOX_DRIVER || 'docker').toLowerCase();

  if (choice === 'agent-platform') {
    return new AgentPlatformClient();
  }
  return new DockerSandboxDriver({
    image: process.env.RESUME_SANDBOX_IMAGE || 'jobocate/resume-harness:latest',
    workdir: SANDBOX_WORKDIR,
    ttlSeconds: Number(process.env.RESUME_SANDBOX_TTL_SECONDS || 900),
    network: process.env.RESUME_SANDBOX_NETWORK,
  });
}
import { LatexService } from './latex/latex.service';
import {
  ResumeHarnessSession,
  ResumeHarnessSessionSchema,
} from './schemas/resume-harness-session.schema';
import {
  HarnessModelAlias,
  HarnessModelAliasSchema,
} from './schemas/harness-model-alias.schema';
import {
  ResumeTemplate,
  ResumeTemplateSchema,
} from './schemas/resume-template.schema';
import { User, UserSchema } from '../schemas/user.schema';
import {
  UserPreferences,
  UserPreferencesSchema,
} from '../schemas/user-preferences.schema';
import { ResumeSandboxReaperService } from './resume-sandbox-reaper.service';
import { IngestionModule } from '../ingestion/ingestion.module';
import { JobDescriptionResolverService } from './job-description-resolver.service';

@Module({
  imports: [
    IngestionModule,
    MongooseModule.forFeature([
      { name: ResumeHarnessSession.name, schema: ResumeHarnessSessionSchema },
      { name: HarnessModelAlias.name, schema: HarnessModelAliasSchema },
      { name: ResumeTemplate.name, schema: ResumeTemplateSchema },
      { name: User.name, schema: UserSchema },
      { name: UserPreferences.name, schema: UserPreferencesSchema },
    ]),
  ],
  controllers: [ResumeHarnessController],
  providers: [
    ResumeHarnessService,
    ModelAliasService,
    CandidateContextService,
    ContextFilesService,
    ResumeTemplateService,
    HarnessRegistry,
    SandboxService,
    ResumeSandboxReaperService,
    JobDescriptionResolverService,
    { provide: SANDBOX_DRIVER, useFactory: sandboxDriverFactory },
    LatexService,
  ],
  exports: [ResumeHarnessService, ModelAliasService, ResumeTemplateService, SandboxService],
})
export class ResumeHarnessModule {}
