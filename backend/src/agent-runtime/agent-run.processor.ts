import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_AGENT, JOB_AGENT_RUN } from '../queue/queue.constants';
import { AgentRuntimeService, AgentRunJobData } from './agent-runtime.service';

/**
 * Bull consumer for background agent runs. Registered as a provider ONLY when
 * QUEUE_ENABLED=true (see agent-runtime.module.ts). Its body just calls the
 * existing `run` method so queued and inline paths do identical work.
 */
@Processor(QUEUE_AGENT)
export class AgentRunProcessor {
  private readonly logger = new Logger(AgentRunProcessor.name);

  constructor(private readonly runtime: AgentRuntimeService) {}

  @Process(JOB_AGENT_RUN)
  async handleRun(job: Job<AgentRunJobData>) {
    const { agentType, userId, input } = job.data;
    this.logger.debug(`Processing agent run job ${job.id} (${agentType}) for user ${userId}`);
    const run = await this.runtime.run(agentType, userId, input);
    this.logger.debug(`Agent run job ${job.id} finished with status ${run.status}`);
    return { runId: String(run._id), status: run.status };
  }
}
