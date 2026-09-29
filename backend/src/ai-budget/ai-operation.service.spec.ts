import { AiOperationService } from './ai-operation.service';
import { SandboxService } from '../resume-harness/sandbox/sandbox.service';

describe('candidate cancellation', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  let rows: Map<string, any>;
  let service: AiOperationService;
  beforeEach(() => {
    rows = new Map();
    const model = {
      findOneAndUpdate: (filter, update, options) => ({ exec: async () => {
        const key = `${filter.userId}:${filter.operationId}`;
        let row = rows.get(key);
        const previous = row && { ...row };
        if (!row && options?.upsert) { row = { ...filter, ...update.$setOnInsert }; rows.set(key, row); }
        if (row) Object.assign(row, update.$set);
        return options?.new === false ? previous : row && { ...row };
      } }),
      findOne: (filter) => ({ exec: async () => {
        const row = rows.get(`${filter.userId}:${filter.operationId}`);
        return row && { ...row };
      } }),
      updateOne: (filter, update) => ({ exec: async () => {
        const row = rows.get(`${filter.userId}:${filter.operationId}`);
        if (row) Object.assign(row, update.$set);
      } }),
    };
    service = new AiOperationService(model as any);
  });

  it('honours cancellation arriving before the request and isolates owners', async () => {
    await service.cancel('alice', id);
    const work = jest.fn();
    await expect(service.run('alice', id, work)).rejects.toMatchObject({ code: 'AI_OPERATION_CANCELLED' });
    expect(work).not.toHaveBeenCalled();
    await expect(service.run('bob', id, async () => 42)).resolves.toBe(42);
  });

  it('stops the sandbox across service instances and waits for accounting before acknowledging cancellation', async () => {
    let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; });
    let stop!: () => void;
    let settle!: () => void;
    const accounting = new Promise<void>(resolve => { settle = resolve; });
    const driver = { destroy: jest.fn(async () => stop()), exec: jest.fn(async () => {
      started();
      await new Promise<void>(resolve => { stop = resolve; });
      return { exitCode: 137, stdout: '', stderr: '' };
    }) };
    const sandbox = new SandboxService(driver as any, service);
    const running = service.run('alice', id, async () => {
      try { await sandbox.exec('box', ['agent']); } finally { await accounting; }
    });
    const rejected = expect(running).rejects.toMatchObject({ code: 'AI_OPERATION_CANCELLED' });
    await ready;
    const otherWorker = new AiOperationService((service as any).model);
    await otherWorker.cancel('alice', id);
    await new Promise(resolve => setTimeout(resolve, 650));
    expect(driver.destroy).toHaveBeenCalledWith('box');
    expect((await service.status('alice', id)).status).toBe('cancelling');
    settle();
    await rejected;
    expect((await service.status('alice', id)).status).toBe('cancelled');
    await expect(service.run('alice', '22222222-2222-4222-8222-222222222222', async () => 'next')).resolves.toBe('next');
  });

  it('cleans up a sandbox that finishes provisioning after Cancel', async () => {
    let provision!: (id: string) => void;
    let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; });
    const driver = { create: jest.fn(() => { started(); return new Promise(resolve => { provision = resolve; }); }), destroy: jest.fn(async () => {}), putFiles: jest.fn() };
    const sandbox = new SandboxService(driver as any, service);
    const running = service.run('alice', id, () => sandbox.provision({ sessionId: 'session', harness: 'opencode', env: {}, files: [{ path: 'prompt', contents: 'private' }] }));
    const rejected = expect(running).rejects.toMatchObject({ code: 'AI_OPERATION_CANCELLED' });
    await ready;
    await service.cancel('alice', id);
    await new Promise(resolve => setTimeout(resolve, 650));
    provision('late-box');
    await rejected;
    expect(driver.destroy).toHaveBeenCalledWith('late-box');
    expect(driver.putFiles).not.toHaveBeenCalled();
  });
});
