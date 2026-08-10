import { Injectable, Logger } from '@nestjs/common';
import { AgentDefinition } from './agent-runtime.types';

/**
 * Registry of agent definitions keyed by `agentType`. Feature modules register
 * their agents at bootstrap; AgentRuntimeService.run resolves the definition by
 * type. Singleton provider exported by AgentRuntimeModule.
 */
@Injectable()
export class AgentDefinitionRegistry {
  private readonly logger = new Logger(AgentDefinitionRegistry.name);
  private readonly defs = new Map<string, AgentDefinition>();

  /** Register an agent definition. A duplicate agentType overwrites + warns. */
  register(def: AgentDefinition): void {
    if (this.defs.has(def.agentType)) {
      this.logger.warn(
        `Agent definition "${def.agentType}" already registered — overwriting`,
      );
    }
    this.defs.set(def.agentType, def);
    this.logger.debug(`Registered agent definition "${def.agentType}"`);
  }

  /** Resolve a definition by agentType (undefined if unknown). */
  get(agentType: string): AgentDefinition | undefined {
    return this.defs.get(agentType);
  }
}
