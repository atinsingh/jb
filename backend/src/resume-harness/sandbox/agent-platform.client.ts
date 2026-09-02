import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * Thin HTTP client for a self-hosted LiteLLM Agent Platform deployment
 * (https://github.com/BerriAI/litellm-agent-platform), which is what actually
 * runs the harness CLIs in a container per session.
 *
 * It is kept deliberately narrow — create, put files, exec, get file, destroy —
 * because that is the whole surface the resume flow needs, and a narrow client
 * is the difference between swapping the sandbox backend later and rewriting
 * the module.
 *
 * Configure with `AGENT_PLATFORM_URL` and `AGENT_PLATFORM_API_KEY`. When those
 * are unset the client reports itself unavailable and the resume screen falls
 * back to its degraded state rather than throwing on boot — a developer machine
 * without the platform running is a normal state, not an error.
 */

export interface SandboxSpec {
  /** Stable, human-readable name; the session id is used so runs are traceable. */
  name: string;
  image: string;
  env: Record<string, string>;
  workdir: string;
  /** Reaped automatically after this long, so a crashed session cannot leak. */
  ttlSeconds: number;
  labels?: Record<string, string>;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

@Injectable()
export class AgentPlatformClient {
  private readonly logger = new Logger(AgentPlatformClient.name);
  private readonly baseUrl?: string;
  private readonly apiKey?: string;

  constructor() {
    const url = process.env.AGENT_PLATFORM_URL;
    this.apiKey = process.env.AGENT_PLATFORM_API_KEY;
    this.baseUrl = url ? url.replace(/\/+$/, '') : undefined;

    if (!this.baseUrl) {
      this.logger.log(
        'Agent Platform not configured (no AGENT_PLATFORM_URL) - resume harness sessions will be unavailable',
      );
    }
  }

  /** Whether an Agent Platform URL is configured. Says nothing about reachability. */
  isConfigured(): boolean {
    return Boolean(this.baseUrl);
  }

  /**
   * Whether the platform actually answers, on a short timeout.
   *
   * Separate from `isConfigured` on purpose: a configured-but-down platform is
   * the common case on a developer machine, and the UI must show that honestly
   * rather than offering a Start button that 503s.
   */
  async ping(): Promise<boolean> {
    if (!this.baseUrl) return false;
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {},
        signal: AbortSignal.timeout(2000),
      });
      // Any HTTP answer means something is listening and routable. A 401 still
      // proves the platform is up — that is a credential problem, not an
      // availability one, and it surfaces on the call that needs the credential.
      return res.status < 500;
    } catch {
      return false;
    }
  }

  async create(spec: SandboxSpec): Promise<string> {
    const body = await this.request<{ id: string }>('POST', '/v1/sandboxes', {
      name: spec.name,
      image: spec.image,
      env: spec.env,
      workdir: spec.workdir,
      ttl_seconds: spec.ttlSeconds,
      labels: spec.labels ?? {},
    });
    return body.id;
  }

  async putFiles(
    sandboxId: string,
    files: { path: string; contents: string }[],
  ): Promise<void> {
    await this.request('PUT', `/v1/sandboxes/${sandboxId}/files`, {
      files: files.map((f) => ({
        path: f.path,
        // base64 so LaTeX backslashes and non-ASCII names survive transport.
        content_base64: Buffer.from(f.contents, 'utf8').toString('base64'),
      })),
    });
  }

  async readFile(sandboxId: string, path: string): Promise<string | null> {
    const body = await this.request<{ content_base64?: string }>(
      'GET',
      `/v1/sandboxes/${sandboxId}/files?path=${encodeURIComponent(path)}`,
      undefined,
      { allowNotFound: true },
    );
    if (!body?.content_base64) return null;
    return Buffer.from(body.content_base64, 'base64').toString('utf8');
  }

  /** Reads a binary artifact (the compiled PDF) without decoding it. */
  async readFileBase64(
    sandboxId: string,
    path: string,
  ): Promise<string | null> {
    const body = await this.request<{ content_base64?: string }>(
      'GET',
      `/v1/sandboxes/${sandboxId}/files?path=${encodeURIComponent(path)}`,
      undefined,
      { allowNotFound: true },
    );
    return body?.content_base64 ?? null;
  }

  async exec(
    sandboxId: string,
    command: string[],
    opts: { timeoutSeconds?: number; cwd?: string } = {},
  ): Promise<ExecResult> {
    const body = await this.request<{
      exit_code: number;
      stdout: string;
      stderr: string;
    }>('POST', `/v1/sandboxes/${sandboxId}/exec`, {
      command,
      timeout_seconds: opts.timeoutSeconds ?? 600,
      cwd: opts.cwd,
    });
    return {
      exitCode: body.exit_code,
      stdout: body.stdout ?? '',
      stderr: body.stderr ?? '',
    };
  }

  async destroy(sandboxId: string): Promise<void> {
    // Teardown is best-effort: the TTL reaps anything a failed delete leaves
    // behind, and a 404 means someone already got there.
    try {
      await this.request('DELETE', `/v1/sandboxes/${sandboxId}`, undefined, {
        allowNotFound: true,
      });
    } catch (err: any) {
      this.logger.warn(
        `Sandbox ${sandboxId} teardown failed (TTL will reap it): ${err?.message}`,
      );
    }
  }

  private async request<T = any>(
    method: string,
    path: string,
    body?: unknown,
    opts: { allowNotFound?: boolean } = {},
  ): Promise<T> {
    if (!this.baseUrl) {
      throw new ServiceUnavailableException(
        'Agent Platform is not configured (AGENT_PLATFORM_URL).',
      );
    }

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'content-type': 'application/json',
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err: any) {
      throw new ServiceUnavailableException(
        `Agent Platform unreachable: ${err?.message ?? 'network error'}`,
      );
    }

    if (res.status === 404 && opts.allowNotFound) {
      return undefined as unknown as T;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new ServiceUnavailableException(
        `Agent Platform ${method} ${path} failed (${res.status}): ${text.slice(0, 400)}`,
      );
    }
    if (res.status === 204) return undefined as unknown as T;
    return (await res.json()) as T;
  }
}
