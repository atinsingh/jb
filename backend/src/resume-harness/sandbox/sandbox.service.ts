import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ExecResult,
  SandboxDriver,
  SANDBOX_DRIVER,
} from './sandbox-driver.interface';
import { HarnessContextFile, HarnessId } from '../harness/harness.types';

export interface ProvisionInput {
  sessionId: string;
  harness: HarnessId;
  env: Record<string, string>;
  files: HarnessContextFile[];
}

/** Workspace root inside every sandbox. */
export const SANDBOX_WORKDIR = '/workspace';

/**
 * One sandbox per session, and never more.
 *
 * The binding is the session id: the sandbox is named after it and labelled
 * with it, so two sessions cannot land on the same container and an orphan is
 * traceable back to the session that leaked it. Teardown follows the session;
 * the TTL is the backstop for the case where it does not.
 */
@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);

  /**
   * Image carrying the three harness CLIs and a TeX Live install. Built from
   * `infra/agent-platform/harness.Dockerfile`.
   */
  private readonly image =
    process.env.RESUME_SANDBOX_IMAGE || 'jobocate/resume-harness:latest';

  private readonly ttlSeconds = Number(
    process.env.RESUME_SANDBOX_TTL_SECONDS || 3600,
  );

  constructor(
    @Inject(SANDBOX_DRIVER) private readonly client: SandboxDriver,
  ) {}

  /**
   * Cached reachability probe. The options endpoint runs on every page load, so
   * an un-cached probe would put a network round trip in front of each one;
   * a few seconds of staleness is the right trade for a state that only
   * changes when someone starts or stops a container.
   */
  private availability?: { at: number; probe: Promise<boolean> };
  private static readonly AVAILABILITY_TTL_MS = 10_000;

  async isAvailable(): Promise<boolean> {
    if (!this.client.isConfigured()) return false;

    const now = Date.now();
    if (
      !this.availability ||
      now - this.availability.at > SandboxService.AVAILABILITY_TTL_MS
    ) {
      // Store the promise, not the result, so concurrent callers share one probe.
      this.availability = { at: now, probe: this.client.ping() };
    }
    return this.availability.probe;
  }

  async provision(input: ProvisionInput): Promise<{ sandboxId: string }> {
    const sandboxId = await this.client.create({
      name: `resume-${input.sessionId}`,
      image: this.image,
      env: input.env,
      workdir: SANDBOX_WORKDIR,
      ttlSeconds: this.ttlSeconds,
      labels: {
        app: 'jobocate',
        surface: 'resume-harness',
        harness: input.harness,
        session: input.sessionId,
      },
    });

    if (input.files.length) {
      await this.client.putFiles(sandboxId, input.files);
    }

    this.logger.log(
      `Sandbox ${sandboxId} provisioned for session ${input.sessionId} (${input.harness})`,
    );
    return { sandboxId };
  }

  writeFiles(sandboxId: string, files: HarnessContextFile[]): Promise<void> {
    return this.client.putFiles(sandboxId, files);
  }

  readFile(sandboxId: string, path: string): Promise<string | null> {
    return this.client.readFile(sandboxId, path);
  }

  readFileBase64(sandboxId: string, path: string): Promise<string | null> {
    return this.client.readFileBase64(sandboxId, path);
  }

  exec(
    sandboxId: string,
    command: string[],
    opts: { timeoutSeconds?: number } = {},
  ): Promise<ExecResult> {
    return this.client.exec(sandboxId, command, {
      ...opts,
      cwd: SANDBOX_WORKDIR,
    });
  }

  /**
   * Streaming variant. Falls back to a buffered exec when the driver has no
   * streaming support, so the caller never has to branch on driver type.
   */
  async execStream(
    sandboxId: string,
    command: string[],
    onChunk: (chunk: string) => void,
    opts: { timeoutSeconds?: number } = {},
  ): Promise<ExecResult> {
    if (this.client.execStream) {
      return this.client.execStream(sandboxId, command, onChunk, {
        ...opts,
        cwd: SANDBOX_WORKDIR,
      });
    }
    const res = await this.exec(sandboxId, command, opts);
    if (res.stdout) onChunk(res.stdout);
    return res;
  }

  async destroy(sandboxId: string): Promise<void> {
    await this.client.destroy(sandboxId);
    this.logger.log(`Sandbox ${sandboxId} destroyed`);
  }
}
