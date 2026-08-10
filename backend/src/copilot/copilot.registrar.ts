import { Injectable, OnModuleInit } from '@nestjs/common';
import { AgentDefinitionRegistry } from '../agent-runtime/agent-definition.registry';
import { ToolRegistry } from '../agent-runtime/tool-registry.service';
import { EligibleJobsService } from '../matching/eligible-jobs.service';
import { CoverLetterGeneratorService } from '../llm/features/cover-letter-generator.service';
import { ApplicationsService } from '../applications/applications.service';
import { ApplicationAgentService } from '../applications/application-agent.service';
import { ApplyRunnerService } from '../apply-runner/apply-runner.service';
import { NotificationsService } from '../notifications/notifications.service';
import { buildCopilotTools } from './copilot.tools';
import { JOB_SEARCH_COPILOT } from './copilot.definition';

/**
 * Registers the five Job-Search Copilot tools + the agent definition at
 * bootstrap, mirroring the runtime's DemoAgentRegistrar pattern. Injects the
 * real feature services and closes them into the tool handlers.
 */
@Injectable()
export class CopilotRegistrar implements OnModuleInit {
  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly definitionRegistry: AgentDefinitionRegistry,
    private readonly eligibleJobs: EligibleJobsService,
    private readonly coverLetters: CoverLetterGeneratorService,
    private readonly applications: ApplicationsService,
    private readonly applicationAgent: ApplicationAgentService,
    private readonly applyRunner: ApplyRunnerService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit(): void {
    const tools = buildCopilotTools({
      eligibleJobs: this.eligibleJobs,
      coverLetters: this.coverLetters,
      applications: this.applications,
      applicationAgent: this.applicationAgent,
      applyRunner: this.applyRunner,
      notifications: this.notifications,
    });
    tools.forEach((t) => this.toolRegistry.register(t));
    this.definitionRegistry.register(JOB_SEARCH_COPILOT);
  }
}
