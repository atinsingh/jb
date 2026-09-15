import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ResumeHarnessService } from '../resume-harness.service';
import { ResumeHarnessSession } from '../schemas/resume-harness-session.schema';
import { StorageService } from '../../storage/storage.service';
import { ModelAliasService } from '../model-alias.service';
import { CandidateContextService } from '../candidate-context.service';
import { ContextFilesService } from '../context-files.service';
import { ResumeTemplateService } from '../resume-template.service';
import { HarnessRegistry } from '../harness/harness.registry';
import { SandboxService } from '../sandbox/sandbox.service';
import { LatexService } from '../latex/latex.service';

describe('Resume harness saved sessions and revisions', () => {
  let service: any;
  let docs: any[];
  let artifacts: Map<string, Buffer>;
  const source =
    '\\documentclass{article}\n\\begin{document}\nJordan Reyes\\\\\njordan@example.com\n\\section*{Experience}\nStaff Engineer at Stripe, 2019--2024.\\\\\nImproved payment platform reliability.\n\\end{document}';
  const pdf = Buffer.from('%PDF-1.7 first');
  const model: any = {
    create: jest.fn(async (data) => {
      const doc = {
        ...data,
        _id: `session-${docs.length}`,
        updatedAt: new Date(),
        save: jest.fn(async () => doc),
      };
      docs.push(doc);
      return doc;
    }),
    findOne: jest.fn((query) => ({
      exec: async () =>
        docs.find(
          (doc) => doc._id === query._id && doc.userId === query.userId,
        ),
    })),
    find: jest.fn((query) => {
      const result: any = {
        exec: async () =>
          docs.filter(
            (doc) =>
              doc.userId === query.userId &&
              (!query.status || doc.status === query.status),
          ),
      };
      result.sort = jest.fn(() => ({
        exec: async () =>
          (await result.exec()).sort((a, b) => +b.updatedAt - +a.updatedAt),
      }));
      return result;
    }),
    updateOne: jest.fn((query, update) => ({
      exec: async () => {
        const doc = docs.find(
          (candidate) =>
            candidate._id === query._id && candidate.userId === query.userId,
        );
        if (doc) {
          Object.assign(doc, update.$set || {});
          for (const key of Object.keys(update.$unset || {})) delete doc[key];
        }
        return { acknowledged: true, modifiedCount: doc ? 1 : 0 };
      },
    })),
    deleteOne: jest.fn((query) => ({
      exec: async () => {
        docs = docs.filter(
          (doc) => !(doc._id === query._id && doc.userId === query.userId),
        );
      },
    })),
  };
  const storage = {
    put: jest.fn(async (key, buffer) => {
      artifacts.set(key, buffer);
      return { key, url: 'unused' };
    }),
    getBuffer: jest.fn(async (key) => artifacts.get(key)),
    delete: jest.fn(async (key) => {
      artifacts.delete(key);
    }),
  };
  const sandbox = {
    provision: jest.fn(async () => ({ sandboxId: 'box' })),
    destroy: jest.fn(async () => undefined),
    writeFiles: jest.fn(async () => undefined),
    exec: jest.fn(async () => ({ exitCode: 0, stdout: 'Updated' })),
    readFile: jest.fn(async () => source),
  };
  const latex = {
    compile: jest.fn(async () => ({
      ok: true,
      log: '',
      pdfBase64: pdf.toString('base64'),
    })),
  };
  const templates = {
    resolve: jest.fn(async (key, vibe, base) => ({
      template: {
        key: key || base?.templateKey || 'classic',
        name: key || 'Classic',
        skeleton: '',
        constraints: [],
      },
      vibe: vibe || base?.vibe || {},
    })),
    condition: jest.fn((template, vibe) => ({
      ...template,
      look: Object.entries(vibe).map(([key, value]) => ({
        key,
        choiceLabel: value,
        label: key,
      })),
    })),
  };
  beforeEach(async () => {
    docs = [];
    artifacts = new Map();
    jest.clearAllMocks();
    storage.put.mockReset().mockImplementation(async (key, buffer) => {
      artifacts.set(key, buffer);
      return { key, url: 'unused' };
    });
    storage.delete.mockReset().mockImplementation(async (key) => {
      artifacts.delete(key);
    });
    sandbox.destroy.mockResolvedValue(undefined);
    sandbox.exec.mockReset().mockResolvedValue({
      exitCode: 0,
      stdout: 'I updated the résumé and verified the result.',
    });
    sandbox.readFile
      .mockReset()
      .mockImplementation(
        async () => `${source}\n% edit ${sandbox.exec.mock.calls.length}`,
      );
    latex.compile.mockResolvedValue({
      ok: true,
      log: '',
      pdfBase64: pdf.toString('base64'),
    });
    const module = await Test.createTestingModule({
      providers: [
        ResumeHarnessService,
        ContextFilesService,
        HarnessRegistry,
        { provide: getModelToken(ResumeHarnessSession.name), useValue: model },
        { provide: StorageService, useValue: storage },
        { provide: SandboxService, useValue: sandbox },
        { provide: LatexService, useValue: latex },
        { provide: ResumeTemplateService, useValue: templates },
        {
          provide: CandidateContextService,
          useValue: {
            build: async () => ({
              markdown:
                '# Candidate facts\n\n## Identity\n\n- Name: Jordan Reyes\n\n## Experience\n\n### Staff Engineer — Stripe\n2019 – 2024',
              summary: { name: 'Jordan Reyes' },
            }),
          },
        },
        {
          provide: ModelAliasService,
          useValue: {
            resolveSelectionForUser: async () => ({
              alias: 'openai/test/low',
              provider: 'openai',
              model: 'test',
              effort: 'low',
              label: 'Test',
            }),
          },
        },
      ],
    }).compile();
    service = module.get(ResumeHarnessService);
  });
  const start = (input = {}) =>
    service.startSession('u1', { model: 'test', effort: 'low', ...input });
  const turn = (id) =>
    service.runTurn('u1', id, { instruction: '  Build my résumé  ' });

  it.each([false, true])(
    'compensates only the new turn PDF after save fails (cleanup fails: %s)',
    async (cleanupFails) => {
      const session = await start();
      await turn(session.id);
      const originalKey = docs[0].pdfKey;
      const failure = new Error('Mongo save failed');
      docs[0].save.mockRejectedValueOnce(failure);
      if (cleanupFails)
        storage.delete.mockRejectedValueOnce(
          new Error('Storage cleanup failed'),
        );
      await expect(turn(session.id)).rejects.toBe(failure);
      expect(storage.delete).toHaveBeenCalledTimes(1);
      expect(storage.delete).toHaveBeenCalledWith(
        `resume-harness/u1/${session.id}/revisions/2.pdf`,
      );
      expect(artifacts.get(originalKey)).toEqual(pdf);
      if (!cleanupFails) expect(artifacts.size).toBe(1);
    },
  );

  it.each(['provision', 'save'])(
    'compensates only the carried copy after %s fails',
    async (stage) => {
      const original = await start();
      await turn(original.id);
      const originalKey = docs[0].pdfKey;
      const failure = new Error(`${stage} failed`);
      const create = model.create.getMockImplementation();
      model.create.mockImplementationOnce(async (data) => {
        const document = await create(data);
        if (stage === 'save') document.save.mockRejectedValueOnce(failure);
        return document;
      });
      if (stage === 'provision')
        sandbox.provision.mockRejectedValueOnce(failure);
      await expect(start({ carryFromSessionId: original.id })).rejects.toBe(
        failure,
      );
      expect(storage.delete).toHaveBeenCalledTimes(1);
      expect(storage.delete).toHaveBeenCalledWith(
        `resume-harness/u1/${docs[1]._id}/revisions/1.pdf`,
      );
      expect(artifacts.get(originalKey)).toEqual(pdf);
      expect(artifacts.size).toBe(1);
      expect(docs[1].status).toBe('failed');
      expect(docs[1].pdfKey).toBeUndefined();
      expect(docs[1].turns[0].pdfKey).toBeUndefined();
    },
  );

  it('returns target role and recorded revision count in start, get, list, and carried session views', async () => {
    const session = await start({ targetRole: 'Staff Engineer' });
    expect(session).toMatchObject({
      targetRole: 'Staff Engineer',
      revisionCount: 0,
    });
    await turn(session.id);
    await service.restoreRevision('u1', session.id, 1);
    expect(await service.getSession('u1', session.id)).toMatchObject({
      targetRole: 'Staff Engineer',
      revisionCount: 2,
    });
    expect((await service.listSessions('u1'))[0]).toMatchObject({
      targetRole: 'Staff Engineer',
      revisionCount: 2,
    });
    const carried = await start({
      carryFromSessionId: session.id,
      targetRole: 'Platform Engineer',
    });
    expect(carried).toMatchObject({
      targetRole: 'Platform Engineer',
      revisionCount: 1,
    });
    expect(carried.revisionCount).toBe(carried.turns.length);
  });

  it('serializes independent document reads so concurrent turns get unique revisions and PDF keys', async () => {
    const session = await start();
    await turn(session.id);
    const originalFind = model.findOne.getMockImplementation();
    // Mongo returns a distinct document per query, not the shared object used
    // by the small fixture in the sequential cases.
    model.findOne.mockImplementation((query) => ({
      exec: async () => {
        const saved = await originalFind(query).exec();
        if (!saved) return undefined;
        const document = JSON.parse(JSON.stringify(saved));
        document.save = jest.fn(async () => {
          const index = docs.findIndex((doc) => doc._id === document._id);
          if (index < 0) throw new Error('Session deleted during save');
          docs[index] = document;
          return document;
        });
        return document;
      },
    }));
    try {
      const results = await Promise.all([turn(session.id), turn(session.id)]);
      expect(results.map((result) => result.revision)).toEqual([2, 3]);
      expect(docs[0].turns.map((revision) => revision.revision)).toEqual([
        1, 2, 3,
      ]);
      expect([...artifacts.keys()]).toEqual(
        [1, 2, 3].map(
          (revision) =>
            `resume-harness/u1/${session.id}/revisions/${revision}.pdf`,
        ),
      );
    } finally {
      model.findOne.mockImplementation(originalFind);
    }
  });

  it('queues restore and deletion until the running turn has committed, then removes all artifacts', async () => {
    const session = await start();
    await turn(session.id);
    let release!: () => void;
    let entered!: () => void;
    const writing = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    sandbox.exec.mockImplementationOnce(async () => {
      entered();
      await blocked;
      return { exitCode: 0, stdout: 'Updated' };
    });
    const pendingTurn = turn(session.id);
    await writing;
    const pendingRestore = service.restoreRevision('u1', session.id, 1);
    const pendingDelete = service.deleteSession('u1', session.id);
    const completion = Promise.allSettled([
      pendingTurn,
      pendingRestore,
      pendingDelete,
    ]);
    await new Promise<void>((resolve) => setImmediate(resolve));
    const destroyedWhileWriting = sandbox.destroy.mock.calls.length;
    release();
    const results = await completion;
    expect(destroyedWhileWriting).toBe(0);
    expect(results.map((result) => result.status)).toEqual([
      'fulfilled',
      'fulfilled',
      'fulfilled',
    ]);
    expect((results[0] as PromiseFulfilledResult<any>).value.revision).toBe(2);
    expect((results[1] as PromiseFulfilledResult<any>).value.revision).toBe(3);
    expect(docs).toHaveLength(0);
    expect(artifacts.size).toBe(0);
  });

  it('can revert the first look change of a carried session through its starting revision', async () => {
    const original = await start();
    await turn(original.id);
    const carried = await start({ carryFromSessionId: original.id });
    const changed = await service.selectTemplate('u1', carried.id, {
      templateKey: 'modern',
    });
    expect(changed.canRevert).toBe(true);
    expect(carried.turns).toHaveLength(1);
    expect(carried.turns[0].revision).toBe(1);
    const reverted = await service.revertLook('u1', carried.id);
    expect(reverted).toMatchObject({
      revision: 3,
      latex: `${source}\n% edit 1`,
      templateKey: 'classic',
      compiled: true,
      hasCurrentPdf: true,
    });
    expect(reverted.turns[2]).toMatchObject({
      kind: 'restore',
      restoredFromRevision: 1,
    });
    await service.deleteSession('u1', original.id);
    expect(await service.getPdf('u1', carried.id)).toBe(pdf.toString('base64'));
  });

  it('rewrites base context when restoring an active revision without a template', async () => {
    const session = await start();
    await turn(session.id);
    docs[0].turns[0].templateKey = undefined;
    docs[0].turns[0].vibe = {};
    await service.selectTemplate('u1', session.id, { templateKey: 'modern' });
    sandbox.writeFiles.mockClear();
    const restored = await service.restoreRevision('u1', session.id, 1);
    expect(restored.templateKey).toBeUndefined();
    const files = (sandbox.writeFiles.mock.calls as any)[0][1];
    const rules = files.find((file) => file.path === 'AGENTS.md');
    expect(rules).toBeDefined();
    expect(rules.contents).not.toContain('modern');
    expect(files).toContainEqual({ path: 'TEMPLATE.tex', contents: '' });
  });

  it('persists a complete revision before saving and serves its PDF after ending', async () => {
    const session = await start({ targetRole: '  Staff Engineer  ' });
    expect(session.name).toBe('Staff Engineer');
    const result = await turn(session.id);
    const key = `resume-harness/u1/${session.id}/revisions/1.pdf`;
    expect(storage.put).toHaveBeenCalledWith(key, pdf, {
      contentType: 'application/pdf',
    });
    expect(storage.put.mock.invocationCallOrder[0]).toBeLessThan(
      docs[0].save.mock.invocationCallOrder[1],
    );
    expect(docs[0].turns[0]).toMatchObject({
      revision: 1,
      latex: `${source}\n% edit 1`,
      pdfKey: key,
      templateKey: 'classic',
      vibe: {},
      kind: 'instruction',
    });
    expect(result.hasCurrentPdf).toBe(true);
    expect(result.turns[0].hasPdf).toBe(true);
    expect(result.turns[0].pdfKey).toBeUndefined();
    await service.endSession('u1', session.id);
    expect(await service.getPdf('u1', session.id)).toBe(pdf.toString('base64'));
    expect((await service.getSession('u1', session.id)).turns).toHaveLength(1);
  });

  it('names an untitled session from its first instruction and retains failed source without a stale PDF', async () => {
    const session = await start();
    expect(session.name).toBe('Untitled résumé');
    await turn(session.id);
    latex.compile.mockResolvedValue({
      ok: false,
      log: 'bad build',
      pdfBase64: pdf.toString('base64'),
    });
    const result = await service.runTurn('u1', session.id, {
      instruction: 'Second instruction',
    });
    expect(result.name).toBe('Build my résumé');
    expect(result.turns[1]).toMatchObject({
      latex: result.latex,
      compiled: false,
      compileLog: 'bad build',
    });
    expect(result.turns[1].pdfKey).toBeUndefined();
    expect(result.pdfBase64).toBeUndefined();
    expect(await service.getPdf('u1', session.id)).toBeNull();
    expect(storage.put).toHaveBeenCalledTimes(1);
  });

  it('does not commit a revision when artifact persistence fails', async () => {
    const session = await start();
    storage.put.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(turn(session.id)).rejects.toThrow('storage unavailable');
    expect(docs[0].revision).toBe(0);
    expect(docs[0].turns).toEqual([]);
  });

  it('appends restores with source look, diagnostics and PDF while preserving history and ended status', async () => {
    const session = await start();
    await turn(session.id);
    await service.selectTemplate('u1', session.id, {
      templateKey: 'modern',
      vibe: { density: 'compact' },
    });
    const original = JSON.parse(JSON.stringify(docs[0].turns));
    const compileCalls = latex.compile.mock.calls.length;
    const restored = await service.restoreRevision('u1', session.id, 1);
    expect(docs[0].turns.slice(0, 2)).toMatchObject(
      original.map(({ createdAt, ...rest }) => rest),
    );
    expect(docs[0].turns[2]).toMatchObject({
      revision: 3,
      kind: 'restore',
      restoredFromRevision: 1,
      latex: `${source}\n% edit 1`,
      templateKey: 'classic',
      vibe: {},
      compiled: true,
      pdfKey: original[0].pdfKey,
    });
    expect(sandbox.writeFiles).toHaveBeenLastCalledWith(
      'box',
      expect.arrayContaining([
        { path: 'resume.tex', contents: `${source}\n% edit 1` },
      ]),
    );
    expect(latex.compile).toHaveBeenCalledTimes(compileCalls);
    await service.endSession('u1', session.id);
    sandbox.writeFiles.mockClear();
    const ended = await service.restoreRevision('u1', session.id, 2);
    expect(ended.status).toBe('ended');
    expect(ended.templateKey).toBe('modern');
    expect(ended.vibe).toEqual({ density: 'compact' });
    expect(sandbox.writeFiles).not.toHaveBeenCalled();
    const next = await start({ carryFromSessionId: session.id });
    expect(next).toMatchObject({
      latex: `${source}\n% edit 2`,
      templateKey: 'modern',
      vibe: { density: 'compact' },
    });
  });

  it('restores a failed revision with its diagnostics and no PDF', async () => {
    const session = await start();
    latex.compile.mockResolvedValue({
      ok: false,
      log: 'failed source',
      pdfBase64: '',
    });
    await turn(session.id);
    latex.compile.mockResolvedValue({
      ok: true,
      log: '',
      pdfBase64: pdf.toString('base64'),
    });
    await turn(session.id);
    const result = await service.restoreRevision('u1', session.id, 1);
    expect(result).toMatchObject({
      compiled: false,
      compileLog: 'failed source',
      revision: 3,
    });
    expect(await service.getPdf('u1', session.id)).toBeNull();
  });

  it('reverts through history to immediately before the latest look change', async () => {
    const session = await start();
    await turn(session.id);
    await service.selectTemplate('u1', session.id, { templateKey: 'modern' });
    await turn(session.id);
    const reverted = await service.revertLook('u1', session.id);
    expect(reverted.turns).toHaveLength(4);
    expect(reverted.turns[3]).toMatchObject({
      kind: 'restore',
      restoredFromRevision: 1,
    });
    expect(reverted.canRevert).toBe(false);
  });

  it('lists only caller sessions by updated time and validates trimmed names', async () => {
    const first = await start();
    const second = await start();
    await service.startSession('u2', { model: 'test', effort: 'low' });
    docs[0].updatedAt = new Date('2026-01-01');
    docs[1].updatedAt = new Date('2026-02-01');
    expect((await service.listSessions('u1')).map((s) => s.id)).toEqual([
      second.id,
      first.id,
    ]);
    expect(
      (
        await service.renameSession('u1', first.id, {
          name: '  Backend roles  ',
        })
      ).name,
    ).toBe('Backend roles');
    for (const name of ['', '   ', 'x'.repeat(201), 123, undefined]) {
      await expect(
        service.renameSession('u1', first.id, { name }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('deletes each unique PDF after destroying the sandbox, then deletes the scoped document', async () => {
    const session = await start();
    await turn(session.id);
    await service.restoreRevision('u1', session.id, 1);
    await service.deleteSession('u1', session.id);
    expect(sandbox.destroy).toHaveBeenCalledWith('box');
    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(model.deleteOne).toHaveBeenCalledWith({
      _id: session.id,
      userId: 'u1',
    });
    expect(storage.delete.mock.invocationCallOrder[0]).toBeLessThan(
      model.deleteOne.mock.invocationCallOrder[0],
    );
    expect(docs).toHaveLength(0);
  });

  it('retains the document when sandbox or PDF cleanup fails so deletion can be retried', async () => {
    const session = await start();
    await turn(session.id);
    sandbox.destroy.mockRejectedValueOnce(new Error('destroy failed'));
    await expect(service.deleteSession('u1', session.id)).rejects.toThrow(
      'destroy failed',
    );
    expect(storage.delete).not.toHaveBeenCalled();
    storage.delete.mockRejectedValueOnce(new Error('delete failed'));
    await expect(service.deleteSession('u1', session.id)).rejects.toThrow(
      'delete failed',
    );
    expect(model.deleteOne).not.toHaveBeenCalled();
    expect(docs).toHaveLength(1);
    await service.deleteSession('u1', session.id);
    expect(docs).toHaveLength(0);
  });

  it('returns 404 for every foreign session operation and unknown revision without mutating artifacts', async () => {
    const session = await start();
    await turn(session.id);
    for (const operation of [
      () => service.getSession('u2', session.id),
      () => service.getPdf('u2', session.id),
      () => service.renameSession('u2', session.id, { name: 'Foreign' }),
      () => service.endSession('u2', session.id),
      () => service.deleteSession('u2', session.id),
      () => service.restoreRevision('u2', session.id, 1),
      () =>
        service.startSession('u2', {
          model: 'test',
          effort: 'low',
          carryFromSessionId: session.id,
        }),
      () => service.restoreRevision('u1', session.id, 99),
    ])
      await expect(operation()).rejects.toBeInstanceOf(NotFoundException);
    expect(sandbox.destroy).not.toHaveBeenCalled();
    expect(storage.delete).not.toHaveBeenCalled();
  });
});
