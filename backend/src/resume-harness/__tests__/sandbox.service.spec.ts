import { SandboxService } from '../sandbox/sandbox.service';

describe('SandboxService ATS lifetime', () => {
  it('uses a long safety lifetime so idle cleanup, not container sleep, ends ATS work', async () => {
    const client = { create: jest.fn().mockResolvedValue('ats-box') };
    const service = new SandboxService(client as any);

    await service.provision({
      sessionId: 'employer-123',
      harness: 'ats',
      env: {},
      files: [],
    });

    expect(client.create).toHaveBeenCalledWith(expect.objectContaining({
      ttlSeconds: 24 * 60 * 60,
      labels: expect.objectContaining({ harness: 'ats' }),
    }));
  });

  it('keeps candidate containers alive long enough for idle cleanup to decide when to end them', async () => {
    const client = { create: jest.fn().mockResolvedValue('candidate-box') };
    const service = new SandboxService(client as any);

    await service.provision({
      sessionId: 'candidate-123',
      harness: 'codex',
      env: {},
      files: [],
    });

    expect(client.create).toHaveBeenCalledWith(expect.objectContaining({
      ttlSeconds: 24 * 60 * 60,
    }));
  });
});
