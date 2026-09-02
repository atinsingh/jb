/**
 * What a sandbox backend has to provide.
 *
 * Deliberately five verbs wide. The resume flow needs to make a workspace, put
 * files in it, run a command, read a file back, and destroy it — nothing more.
 * Keeping the surface this narrow is what let the backend be swapped from the
 * LiteLLM Agent Platform to the local Docker daemon without touching the
 * session, harness or LaTeX layers.
 */

export interface SandboxSpec {
  /** Stable, human-readable name. The session id is used, so runs are traceable. */
  name: string;
  image: string;
  env: Record<string, string>;
  workdir: string;
  /** Reaped after this long so a crashed session cannot leak a container. */
  ttlSeconds: number;
  labels?: Record<string, string>;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface SandboxDriver {
  /** Whether this driver has what it needs to run at all (config, binary). */
  isConfigured(): boolean;
  /** Whether the backend actually answers right now. Short timeout. */
  ping(): Promise<boolean>;

  create(spec: SandboxSpec): Promise<string>;
  putFiles(id: string, files: { path: string; contents: string }[]): Promise<void>;
  readFile(id: string, path: string): Promise<string | null>;
  readFileBase64(id: string, path: string): Promise<string | null>;
  exec(
    id: string,
    command: string[],
    opts?: { timeoutSeconds?: number; cwd?: string },
  ): Promise<ExecResult>;
  /** Optional: run a command and report stdout as it arrives. */
  execStream?(
    id: string,
    command: string[],
    onChunk: (chunk: string) => void,
    opts?: { timeoutSeconds?: number; cwd?: string },
  ): Promise<ExecResult>;
  destroy(id: string): Promise<void>;
}

/** DI token — the concrete driver is chosen in the module by env. */
export const SANDBOX_DRIVER = Symbol('SANDBOX_DRIVER');
