import { BadRequestException, Injectable } from '@nestjs/common';
import { ClaudeCodeHarness } from './claude-code.harness';
import { CodexHarness } from './codex.harness';
import { OpenCodeHarness } from './opencode.harness';
import { HARNESS_IDS, HarnessAdapter, HarnessId } from './harness.types';

/**
 * The single place that knows which harnesses exist.
 *
 * Supporting a fourth harness is: add an adapter file, add it to `ADAPTERS`,
 * add its id to `HARNESS_IDS`. Nothing in the session, sandbox or LaTeX layers
 * changes, and the HTTP contract the frontend talks to does not move.
 */
@Injectable()
export class HarnessRegistry {
  private readonly adapters = new Map<HarnessId, HarnessAdapter>(
    [new ClaudeCodeHarness(), new CodexHarness(), new OpenCodeHarness()].map(
      (a) => [a.id, a as HarnessAdapter],
    ),
  );

  list(): HarnessAdapter[] {
    // HARNESS_IDS fixes display order; the map fixes membership.
    return HARNESS_IDS.map((id) => this.adapters.get(id)!).filter(Boolean);
  }

  get(id: HarnessId): HarnessAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      throw new BadRequestException(
        `Unknown harness "${id}". Supported: ${HARNESS_IDS.join(', ')}.`,
      );
    }
    return adapter;
  }

  isSupported(id: string): id is HarnessId {
    return this.adapters.has(id as HarnessId);
  }
}
