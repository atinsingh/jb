import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ToolRegistry } from '../../agent-runtime/tool-registry.service';
import { AgentDefinitionRegistry } from '../../agent-runtime/agent-definition.registry';
import { EmployerApplicant, EmployerApplicantDocument } from '../../employer-pipeline/schemas/employer-applicant.schema';
import { EmployerAiActionsService } from '../employer-ai-actions.service';
import { buildRecruiterCopilotTools } from './recruiter-copilot.tools';
import { RECRUITER_COPILOT } from './recruiter-copilot.definition';

@Injectable()
export class RecruiterCopilotRegistrar implements OnModuleInit {
  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly definitionRegistry: AgentDefinitionRegistry,
    @InjectModel(EmployerApplicant.name)
    private readonly applicantModel: Model<EmployerApplicantDocument>,
    private readonly actionsService: EmployerAiActionsService,
  ) {}

  onModuleInit() {
    const tools = buildRecruiterCopilotTools({
      applicantModel: this.applicantModel,
      actionsService: this.actionsService,
    });
    tools.forEach((tool) => this.toolRegistry.register(tool));
    this.definitionRegistry.register(RECRUITER_COPILOT);
  }
}
