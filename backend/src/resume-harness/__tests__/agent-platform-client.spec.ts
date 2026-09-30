import { AgentPlatformClient } from '../sandbox/agent-platform.client';

describe('AgentPlatformClient authenticated availability', () => {
  const previous = process.env.AGENT_PLATFORM_URL;
  beforeEach(() => { process.env.AGENT_PLATFORM_URL = 'https://gateway.test'; });
  afterEach(() => {
    jest.restoreAllMocks();
    if (previous === undefined) delete process.env.AGENT_PLATFORM_URL;
    else process.env.AGENT_PLATFORM_URL = previous;
  });
  it.each([401,404,503])('does not offer sessions when health returns %s', async (status) => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', {status}));
    await expect(new AgentPlatformClient().ping()).resolves.toBe(false);
  });
  it('bounds long exec requests while allowing their server-side command timeout', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({exit_code:0})));
    await new AgentPlatformClient().exec('sandbox', ['true'], {timeoutSeconds:60});
    expect(fetchMock.mock.calls[0][1]?.signal).toBeDefined();
  });
});
