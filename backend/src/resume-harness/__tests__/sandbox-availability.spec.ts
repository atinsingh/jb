import { SandboxService } from '../sandbox/sandbox.service';
import { AgentPlatformClient } from '../sandbox/agent-platform.client';

/**
 * "Available" has to mean reachable, not merely configured.
 *
 * The resume screen asks the backend whether it can start a session and paints
 * a degraded state when it cannot. Reporting availability from the presence of
 * an env var made that promise on behalf of a service nobody had contacted:
 * the picker rendered a working Start button, and the candidate discovered the
 * truth as a 503 after committing to a session. An unreachable platform must
 * read as unavailable BEFORE anything is offered.
 */
describe('SandboxService.isAvailable', () => {
  const makeClient = (overrides: Partial<AgentPlatformClient> = {}) =>
    ({
      isConfigured: () => true,
      ping: jest.fn(async () => true),
      ...overrides,
    }) as unknown as AgentPlatformClient;

  it('is false when the platform is not configured at all', async () => {
    const client = makeClient({ isConfigured: () => false } as any);
    const service = new SandboxService(client);
    await expect(service.isAvailable()).resolves.toBe(false);
  });

  it('is false when configured but unreachable', async () => {
    const ping = jest.fn(async () => false);
    const service = new SandboxService(makeClient({ ping } as any));

    await expect(service.isAvailable()).resolves.toBe(false);
    expect(ping).toHaveBeenCalled();
  });

  it('is true only when the platform actually answers', async () => {
    const service = new SandboxService(makeClient());
    await expect(service.isAvailable()).resolves.toBe(true);
  });

  it('does not probe once per request', async () => {
    // The options endpoint is hit on every page load; an un-cached probe would
    // put a network round trip in front of each one.
    const ping = jest.fn(async () => true);
    const service = new SandboxService(makeClient({ ping } as any));

    await Promise.all([
      service.isAvailable(),
      service.isAvailable(),
      service.isAvailable(),
    ]);

    expect(ping).toHaveBeenCalledTimes(1);
  });

  it('labels each new resume sandbox with its configured expiration time', async () => {
    const originalTtl = process.env.RESUME_SANDBOX_TTL_SECONDS;
    process.env.RESUME_SANDBOX_TTL_SECONDS = '900';
    const create = jest.fn(async () => 'resume-session-1');
    const service = new SandboxService(makeClient({ create } as any));
    const now = jest.spyOn(Date, 'now').mockReturnValue(
      new Date('2026-09-09T16:00:00.000Z').getTime(),
    );
    try {
      await service.provision({
        sessionId: 'session-1',
        harness: 'codex',
        env: {},
        files: [],
      });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'jb-resume-session-1',
          labels: expect.objectContaining({
            app: 'jobocate',
            namespace: 'jb',
            surface: 'resume-harness',
            session: 'session-1',
            expiresAt: '2026-09-09T16:15:00.000Z',
          }),
        }),
      );
    } finally {
      now.mockRestore();
      if (originalTtl === undefined) {
        delete process.env.RESUME_SANDBOX_TTL_SECONDS;
      } else {
        process.env.RESUME_SANDBOX_TTL_SECONDS = originalTtl;
      }
    }
  });
});
