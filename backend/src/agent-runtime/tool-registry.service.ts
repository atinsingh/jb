import { Injectable, Logger } from '@nestjs/common';
import { AgentTool } from './agent-runtime.types';

/**
 * Central registry of agent tools. Feature modules (e.g. the Job-Search Copilot
 * in wave 3c) call {@link register} at bootstrap to contribute their tools; the
 * runtime resolves them by name via {@link get} / {@link list}. The registry is
 * a singleton provider exported by AgentRuntimeModule.
 */
@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);
  private readonly tools = new Map<string, AgentTool>();

  /** Register a tool. A duplicate name overwrites and logs a warning. */
  register(tool: AgentTool): void {
    if (this.tools.has(tool.name)) {
      this.logger.warn(`Tool "${tool.name}" is already registered — overwriting`);
    }
    this.tools.set(tool.name, tool);
    this.logger.debug(`Registered tool "${tool.name}"`);
  }

  /** Look up a single tool by name (undefined if not registered). */
  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Resolve an allow-list of tool names to their tool definitions. Names that
   * are not registered are silently skipped (the caller decides how strict to
   * be); order follows the input list.
   */
  list(names: string[]): AgentTool[] {
    const out: AgentTool[] = [];
    for (const name of names) {
      const tool = this.tools.get(name);
      if (tool) {
        out.push(tool);
      } else {
        this.logger.warn(`Requested tool "${name}" is not registered`);
      }
    }
    return out;
  }
}
