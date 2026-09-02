import { DockerSandboxDriver } from '../sandbox/docker-sandbox.driver';

/**
 * The local-Docker sandbox driver.
 *
 * It replaces the LiteLLM Agent Platform, which publishes no image and whose
 * sandbox API is undocumented. Docker is already a hard dependency of this
 * repo (Mongo and the proxy both run on it), so driving the daemon directly
 * removes a service instead of adding one — and the session/sandbox contract
 * is unchanged, which is the point of `SandboxDriver`.
 *
 * Everything below asserts on the argv actually handed to `docker`. A sandbox
 * that runs the wrong container, leaks the workspace, or interpolates a
 * filename into a shell is a defect this suite has to catch, because the
 * integration only fails much later and much less legibly.
 */
describe('DockerSandboxDriver', () => {
  let calls: { argv: string[]; stdin?: string }[];
  let nextResult: { code: number; stdout: string; stderr: string };

  const run = jest.fn(async (argv: string[], stdin?: string) => {
    calls.push({ argv, stdin });
    return nextResult;
  });

  const driver = () =>
    new DockerSandboxDriver({
      image: 'jobocate/resume-harness:latest',
      workdir: '/workspace',
      ttlSeconds: 3600,
      run: run as any,
    });

  beforeEach(() => {
    calls = [];
    nextResult = { code: 0, stdout: 'container-id-abc\n', stderr: '' };
    run.mockClear();
  });

  const argvOf = (i: number) => calls[i].argv;

  it('runs one detached container per session, named and labelled by session', async () => {
    const id = await driver().create({
      name: 'resume-sess-1',
      image: 'jobocate/resume-harness:latest',
      env: { ANTHROPIC_BASE_URL: 'http://litellm:4000', SECRET: 's3cr3t' },
      workdir: '/workspace',
      ttlSeconds: 3600,
      labels: { session: 'sess-1', harness: 'codex' },
    });

    expect(id).toBe('resume-sess-1');
    const argv = argvOf(0);
    expect(argv[0]).toBe('run');
    expect(argv).toContain('-d');
    expect(argv).toEqual(expect.arrayContaining(['--name', 'resume-sess-1']));
    expect(argv).toEqual(expect.arrayContaining(['-w', '/workspace']));
    expect(argv).toEqual(expect.arrayContaining(['--label', 'session=sess-1']));
    expect(argv).toEqual(expect.arrayContaining(['--label', 'harness=codex']));
    expect(argv[argv.length - 3]).toBe('jobocate/resume-harness:latest');
  });

  it('joins the network the proxy is on, or the harness cannot reach a model', async () => {
    const withNet = new DockerSandboxDriver({
      image: 'img',
      workdir: '/workspace',
      ttlSeconds: 60,
      network: 'jb_jobocate-network',
      run: run as any,
    });
    await withNet.create({
      name: 'resume-sess-net',
      image: 'img',
      env: {},
      workdir: '/workspace',
      ttlSeconds: 60,
      labels: {},
    });
    // Without this the container lands on the default bridge, where
    // `localhost:4000` is the container itself and the proxy is unreachable.
    expect(argvOf(0)).toEqual(
      expect.arrayContaining(['--network', 'jb_jobocate-network']),
    );
  });

  it('passes env as separate argv pairs, never interpolated into a shell', async () => {
    await driver().create({
      name: 'resume-sess-2',
      image: 'img',
      // A value containing shell metacharacters must survive verbatim.
      env: { EVIL: 'a"; rm -rf /; echo "b' },
      workdir: '/workspace',
      ttlSeconds: 60,
      labels: {},
    });

    const argv = argvOf(0);
    const i = argv.indexOf('-e');
    expect(i).toBeGreaterThan(-1);
    expect(argv[i + 1]).toBe('EVIL=a"; rm -rf /; echo "b');
    // The whole command is argv, so no element is a composed shell string.
    expect(argv.join(' ')).not.toMatch(/sh -c .*EVIL/);
  });

  it('writes files through stdin rather than the command line', async () => {
    await driver().putFiles('resume-sess-1', [
      { path: 'AGENTS.md', contents: '# rules\nline two' },
    ]);

    const { argv, stdin } = calls[0];
    expect(argv.slice(0, 3)).toEqual(['exec', '-i', 'resume-sess-1']);
    // The content is piped, so LaTeX backslashes and quotes cannot be reparsed.
    expect(stdin).toBe('# rules\nline two');
    expect(argv.join(' ')).not.toContain('line two');
  });

  it('reads a file back as base64 so binary survives', async () => {
    nextResult = {
      code: 0,
      stdout: Buffer.from('\\documentclass{article}').toString('base64'),
      stderr: '',
    };
    const out = await driver().readFile('resume-sess-1', 'resume.tex');
    expect(out).toBe('\\documentclass{article}');
  });

  it('returns null for a file that does not exist rather than throwing', async () => {
    nextResult = { code: 1, stdout: '', stderr: 'No such file or directory' };
    await expect(driver().readFile('s', 'missing.tex')).resolves.toBeNull();
  });

  it('runs a harness turn as argv inside the workspace', async () => {
    nextResult = { code: 0, stdout: 'edited resume.tex', stderr: '' };
    const res = await driver().exec('resume-sess-1', ['codex', 'exec', 'do it'], {
      cwd: '/workspace',
    });

    const argv = argvOf(0);
    expect(argv.slice(0, 3)).toEqual(['exec', '-w', '/workspace']);
    expect(argv.slice(-3)).toEqual(['codex', 'exec', 'do it']);
    expect(res).toEqual({ exitCode: 0, stdout: 'edited resume.tex', stderr: '' });
  });

  it('force-removes the container on teardown', async () => {
    await driver().destroy('resume-sess-1');
    expect(argvOf(0)).toEqual(['rm', '-f', 'resume-sess-1']);
  });

  it('survives a teardown of something already gone', async () => {
    nextResult = { code: 1, stdout: '', stderr: 'No such container' };
    await expect(driver().destroy('ghost')).resolves.toBeUndefined();
  });

  it('reports unavailable when the daemon does not answer', async () => {
    nextResult = { code: 1, stdout: '', stderr: 'Cannot connect to the Docker daemon' };
    await expect(driver().ping()).resolves.toBe(false);

    nextResult = { code: 0, stdout: 'Server Version: 27.0', stderr: '' };
    await expect(driver().ping()).resolves.toBe(true);
  });
});

/**
 * Streaming a turn.
 *
 * A harness turn takes tens of seconds. Buffering its output until exit means
 * the candidate watches a spinner with no evidence anything is happening, and
 * no way to tell "thinking" from "hung". `execStream` emits stdout as it
 * arrives so the screen can show the work.
 */
describe('DockerSandboxDriver.execStream', () => {
  it('emits output as it arrives and resolves with the exit code', async () => {
    const chunks: string[] = [];
    const streamRun = jest.fn(
      async (_argv: string[], _stdin: any, _timeout: any, onChunk: any) => {
        onChunk('reading AGENTS.md\n');
        onChunk('writing resume.tex\n');
        return { code: 0, stdout: 'reading AGENTS.md\nwriting resume.tex\n', stderr: '' };
      },
    );

    const driver = new DockerSandboxDriver({
      image: 'img',
      workdir: '/workspace',
      ttlSeconds: 60,
      run: streamRun as any,
    });

    const res = await driver.execStream(
      'sbx',
      ['opencode', 'run', 'do it'],
      (c) => chunks.push(c),
    );

    expect(chunks).toEqual(['reading AGENTS.md\n', 'writing resume.tex\n']);
    expect(res.exitCode).toBe(0);
    // Same argv shape as exec — streaming is a delivery detail, not a
    // different way of running the harness.
    expect(streamRun.mock.calls[0][0].slice(0, 3)).toEqual(['exec', '-w', '/workspace']);
  });
});
