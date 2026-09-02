import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import {
  ExecResult,
  SandboxDriver,
  SandboxSpec,
} from './sandbox-driver.interface';

/** Result of one `docker …` invocation. */
export interface DockerRunResult {
  code: number;
  stdout: string;
  stderr: string;
}

export type DockerRunner = (
  argv: string[],
  stdin?: string,
  timeoutMs?: number,
  /** Called with each stdout chunk as it arrives, when streaming. */
  onChunk?: (chunk: string) => void,
) => Promise<DockerRunResult>;

export interface DockerSandboxOptions {
  image: string;
  workdir: string;
  ttlSeconds: number;
  /** Docker network to join. Must be the one the LiteLLM proxy is on. */
  network?: string;
  /** Injected in tests; defaults to spawning the real `docker` binary. */
  run?: DockerRunner;
}

/**
 * Per-session sandboxes on the local Docker daemon.
 *
 * This is the driver the resume flow actually runs on. It replaced the LiteLLM
 * Agent Platform, which turned out to publish no image and to expose no
 * documented sandbox API — the client written against it was guessing. Docker
 * is already required by this repo (Mongo, the LiteLLM proxy), so talking to
 * the daemon directly removed a service rather than adding one.
 *
 * Two rules hold throughout:
 *
 * 1. **Everything is argv, never a shell string.** Container names, env values
 *    and harness prompts all come from user data or model output. Composing
 *    them into `sh -c` would be a command-injection hole; `execFile` with an
 *    argv array cannot be reparsed. File contents go over stdin for the same
 *    reason — LaTeX is mostly backslashes and braces.
 * 2. **The container is the boundary.** The harness runs with no approval
 *    prompts because it cannot reach outside the workspace, so the container
 *    must stay unprivileged and network-limited to the proxy.
 */
@Injectable()
export class DockerSandboxDriver implements SandboxDriver {
  private readonly logger = new Logger(DockerSandboxDriver.name);
  private readonly image: string;
  private readonly workdir: string;
  private readonly ttlSeconds: number;
  private readonly network?: string;
  private readonly run: DockerRunner;

  constructor(opts: DockerSandboxOptions) {
    this.image = opts.image;
    this.workdir = opts.workdir;
    this.ttlSeconds = opts.ttlSeconds;
    this.network = opts.network;
    this.run = opts.run ?? defaultDockerRunner;
  }

  isConfigured(): boolean {
    // The binary is the only requirement; whether the daemon is up is `ping`.
    return true;
  }

  async ping(): Promise<boolean> {
    const res = await this.run(['info', '--format', '{{.ServerVersion}}'], undefined, 5000);
    return res.code === 0;
  }

  async create(spec: SandboxSpec): Promise<string> {
    const argv = [
      'run',
      '-d',
      '--name',
      spec.name,
      '-w',
      spec.workdir,
      // Unprivileged and capability-stripped: the harness needs to edit files
      // and run latexmk, nothing that requires elevation.
      '--security-opt',
      'no-new-privileges',
      '--cap-drop',
      'ALL',
      // Bound the blast radius of a runaway agent loop.
      '--memory',
      '2g',
      '--pids-limit',
      '512',
    ];

    // The sandbox must sit on the proxy's network: the harness talks to
    // LiteLLM by service name, and on the default bridge 'localhost' would be
    // the sandbox itself.
    if (this.network) argv.push('--network', this.network);

    for (const [key, value] of Object.entries(spec.env)) {
      // One argv element per variable — the value is never parsed by a shell.
      argv.push('-e', `${key}=${value}`);
    }
    for (const [key, value] of Object.entries(spec.labels ?? {})) {
      argv.push('--label', `${key}=${value}`);
    }

    // `sleep` keeps the container alive so turns can exec into it; the TTL is
    // the backstop that reaps a session nobody ended.
    argv.push(spec.image, 'sleep', String(spec.ttlSeconds));

    const res = await this.run(argv);
    if (res.code !== 0) {
      throw new Error(`docker run failed: ${res.stderr.trim() || res.stdout.trim()}`);
    }

    this.logger.log(`Sandbox container ${spec.name} started from ${spec.image}`);
    // Address the container by the name we chose, not the returned id: it is
    // derived from the session, so it stays legible in `docker ps`.
    return spec.name;
  }

  async putFiles(
    id: string,
    files: { path: string; contents: string }[],
  ): Promise<void> {
    for (const file of files) {
      const dir = file.path.includes('/')
        ? file.path.slice(0, file.path.lastIndexOf('/'))
        : '';
      if (dir) {
        await this.run(['exec', id, 'mkdir', '-p', `${this.workdir}/${dir}`]);
      }
      // Content over stdin, path as an argv element: nothing in either is
      // exposed to a shell.
      const res = await this.run(
        ['exec', '-i', id, 'tee', `${this.workdir}/${file.path}`],
        file.contents,
      );
      if (res.code !== 0) {
        throw new Error(`writing ${file.path} failed: ${res.stderr.trim()}`);
      }
    }
  }

  async readFile(id: string, path: string): Promise<string | null> {
    const b64 = await this.readFileBase64(id, path);
    return b64 === null ? null : Buffer.from(b64, 'base64').toString('utf8');
  }

  async readFileBase64(id: string, path: string): Promise<string | null> {
    // base64 in the container so a PDF survives the trip unmangled.
    const res = await this.run([
      'exec',
      id,
      'sh',
      '-c',
      // The only `sh -c` in this file, and its argument is a fixed string —
      // the path arrives as $0, so it is never parsed as shell syntax.
      'base64 "$0" 2>/dev/null | tr -d "\\n"',
      `${this.workdir}/${path}`,
    ]);
    if (res.code !== 0 || !res.stdout.trim()) return null;
    return res.stdout.trim();
  }

  async exec(
    id: string,
    command: string[],
    opts: { timeoutSeconds?: number; cwd?: string } = {},
  ): Promise<ExecResult> {
    const argv = ['exec', '-w', opts.cwd || this.workdir, id, ...command];
    const res = await this.run(
      argv,
      undefined,
      (opts.timeoutSeconds ?? 900) * 1000,
    );
    return { exitCode: res.code, stdout: res.stdout, stderr: res.stderr };
  }

  /**
   * Like `exec`, but reports stdout as it arrives.
   *
   * A harness turn runs for tens of seconds. Without this the candidate gets a
   * spinner and no way to distinguish a model thinking from a hung container,
   * so the screen streams the agent's own narration instead.
   */
  async execStream(
    id: string,
    command: string[],
    onChunk: (chunk: string) => void,
    opts: { timeoutSeconds?: number; cwd?: string } = {},
  ): Promise<ExecResult> {
    const argv = ['exec', '-w', opts.cwd || this.workdir, id, ...command];
    const res = await this.run(
      argv,
      undefined,
      (opts.timeoutSeconds ?? 900) * 1000,
      onChunk,
    );
    return { exitCode: res.code, stdout: res.stdout, stderr: res.stderr };
  }

  async destroy(id: string): Promise<void> {
    // Best effort: a container already gone is the desired end state.
    const res = await this.run(['rm', '-f', id]);
    if (res.code !== 0) {
      this.logger.warn(`Sandbox ${id} teardown: ${res.stderr.trim()}`);
    }
  }
}

/** Spawns the real `docker` binary. */
const defaultDockerRunner: DockerRunner = (
  argv,
  stdin,
  timeoutMs = 900_000,
  onChunk,
) =>
  new Promise((resolve) => {
    const child = execFile(
      'docker',
      argv,
      { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024 },
      (err, stdout, stderr) => {
        resolve({
          code: err ? ((err as any).code ?? 1) : 0,
          stdout: stdout ?? '',
          stderr: stderr ?? '',
        });
      },
    );
    // The callback above still delivers the complete output; this only adds a
    // live tap so the caller can forward progress before the process exits.
    if (onChunk) {
      child.stdout?.on('data', (d) => onChunk(String(d)));
      child.stderr?.on('data', (d) => onChunk(String(d)));
    }
    if (stdin !== undefined) {
      child.stdin?.end(stdin);
    }
  });
