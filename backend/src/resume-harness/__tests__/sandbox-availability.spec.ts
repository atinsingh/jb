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
});
