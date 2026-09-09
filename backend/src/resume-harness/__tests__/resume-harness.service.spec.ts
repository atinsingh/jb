import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { ResumeHarnessService } from '../resume-harness.service';
import { ModelAliasService } from '../model-alias.service';
import { CandidateContextService } from '../candidate-context.service';
import { ContextFilesService } from '../context-files.service';
import { ResumeTemplateService } from '../resume-template.service';
import { HarnessRegistry } from '../harness/harness.registry';
import { SandboxService } from '../sandbox/sandbox.service';
import { LatexService } from '../latex/latex.service';
import { ResumeHarnessSession } from '../schemas/resume-harness-session.schema';
import { LITELLM_TAG_HEADER } from '../harness/harness.types';
import { StorageService } from '../../storage/storage.service';

/**
 * A minimally realistic résumé.
 *
 * A one-word fixture used to be enough here, but the content guard now rejects a document
 * with no prose and no candidate name — correctly, since that is the bug it
 * exists to catch. Fixtures have to look like the thing being tested.
 */
const resumeDoc = (marker: string) =>
  [
    '\\documentclass{article}',
    '\\begin{document}',
    '{\\Huge Jordan Reyes}',
    'Senior Backend Engineer, jordan@example.com',
    'Staff Engineer at Stripe, 2019 to 2024.',
    'Cut payment retry latency across the EU corridor. ' + marker,
    '\\end{document}',
  ].join('\n');

const ALIAS = {
  alias: 'anthropic/claude-sonnet-4-5/high',
  provider: 'anthropic',
  model: 'claude-sonnet-4-5',
  effort: 'high',
  label: 'Sonnet 4.5 - high effort',
};

describe('ResumeHarnessService', () => {
  let service: ResumeHarnessService;

  /** Minimal mongoose stand-in: documents are plain objects with save(). */
  let store: any[];
  let boxSeq: number;
  const createSession = async (doc: any) => {
    const saved = {
      ...doc,
      _id: `sess-${store.length + 1}`,
      createdAt: doc.createdAt || new Date(),
      save: jest.fn(async function (this: any) {
        return this;
      }),
    };
    store.push(saved);
    return saved;
  };
  const sessionModel: any = {
    create: jest.fn(createSession),
    find: jest.fn((q: any) => ({
      exec: async () =>
        store.filter((d) => {
          if (q.userId != null && String(d.userId) !== String(q.userId)) {
            return false;
          }
          if (q.status != null && d.status !== q.status) return false;
          if (q.createdAt?.$lt && !(d.createdAt < q.createdAt.$lt))
            return false;
          return true;
        }),
    })),
    findOne: jest.fn((q: any) => ({
      exec: async () =>
        store.find(
          (d) =>
            String(d._id) === String(q._id) &&
            String(d.userId) === String(q.userId),
        ) || null,
    })),
  };

  const sandbox: any = {
    provision: jest.fn(async () => ({ sandboxId: `sbx-${++boxSeq}` })),
    writeFiles: jest.fn(async () => undefined),
    readFile: jest.fn(async () => resumeDoc('base')),
    exec: jest.fn(async () => ({ exitCode: 0, stdout: 'ok', stderr: '' })),
    destroy: jest.fn(async () => undefined),
  };

  const latex: any = {
    compile: jest.fn(async () => ({ ok: true, log: '', pdfBase64: 'JVBER' })),
  };
  const storage: any = { put: jest.fn(async () => ({})), getBuffer: jest.fn(async () => Buffer.from('%PDF')) };

  const modelAlias: any = {
    resolveForUser: jest.fn(async () => ALIAS),
    listForUser: jest.fn(async () => [ALIAS]),
  };

  const candidateContext: any = {
    build: jest.fn(async () => ({
      markdown: '# Candidate facts\n\n- Name: Jordan Reyes\n',
      missing: [],
      hasEnoughToGenerate: true,
      summary: { name: 'Jordan Reyes', roles: [] },
    })),
  };

  /**
   * A single-template catalogue.
   *
   * This suite is about the session flow rather than the look, so the stub is
   * the smallest thing that satisfies the contract. Template selection and
   * vibe changes have their own suite in `resume-harness-look.service.spec.ts`.
   */
  const templates: any = {
    list: jest.fn(async () => []),
    resolve: jest.fn(async () => ({
      template: {
        key: 'classic-serif',
        name: 'Classic Serif',
        description: 'Traditional.',
        skeleton: '% skeleton',
        constraints: [],
        knobs: [],
      },
      vibe: {},
    })),
    condition: jest.fn((template: any) => ({
      key: template.key,
      name: template.name,
      description: template.description,
      skeleton: template.skeleton,
      constraints: [],
      look: [],
    })),
  };

  beforeEach(async () => {
    store = [];
    boxSeq = 0;
    jest.clearAllMocks();
    sessionModel.create.mockReset().mockImplementation(createSession);
    sandbox.provision.mockReset().mockImplementation(async () => ({
      sandboxId: `sbx-${++boxSeq}`,
    }));
    sandbox.destroy.mockReset().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeHarnessService,
        ContextFilesService,
        HarnessRegistry,
        {
          provide: getModelToken(ResumeHarnessSession.name),
          useValue: sessionModel,
        },
        { provide: SandboxService, useValue: sandbox },
        { provide: LatexService, useValue: latex },
        { provide: StorageService, useValue: storage },
        { provide: ModelAliasService, useValue: modelAlias },
        { provide: CandidateContextService, useValue: candidateContext },
        { provide: ResumeTemplateService, useValue: templates },
      ],
    }).compile();

    service = module.get(ResumeHarnessService);
  });

  const start = (harness: any = 'claude-code') =>
    service.startSession('u1', { harness });

  it('provisions exactly one sandbox per session and binds it to the session', async () => {
    const a = await start();
    const b = await start('codex');

    expect(sandbox.provision).toHaveBeenCalledTimes(2);
    expect(a.sandboxId).toBeTruthy();
    expect(a.id).not.toEqual(b.id);
    // Two sessions never share a sandbox.
    expect(sandbox.provision.mock.calls[0][0].sessionId).not.toEqual(
      sandbox.provision.mock.calls[1][0].sessionId,
    );
  });

  it('replaces the previous live sandbox when the same user starts again', async () => {
    const a = await start();
    const b = await start('codex');

    expect(sandbox.destroy).toHaveBeenCalledWith(a.sandboxId);
    expect(store.find((s) => String(s._id) === a.id).status).toBe('ended');
    expect(b.status).toBe('active');
    expect(a.sandboxId).not.toBe(b.sandboxId);
    expect(sandbox.provision).toHaveBeenCalledTimes(2);
  });

  it('serializes concurrent starts so one user has only one live sandbox', async () => {
    const createSession = sessionModel.create.getMockImplementation();
    let releaseFirstCreate!: () => void;
    const firstCreateEntered = new Promise<void>((resolveEntered) => {
      sessionModel.create.mockImplementationOnce(async (doc: any) => {
        await new Promise<void>((resolveCreate) => {
          releaseFirstCreate = resolveCreate;
          resolveEntered();
        });
        return createSession!(doc);
      });
    });

    const firstPromise = start('claude-code');
    await firstCreateEntered;
    const secondPromise = start('codex');

    // Let the second request reach the unprotected create path before allowing
    // the first request to persist. Without per-user serialization, both
    // requests observe an empty active-session set and both remain live.
    await new Promise<void>((resolve) => setImmediate(resolve));
    releaseFirstCreate();

    const [first, second] = await Promise.all([firstPromise, secondPromise]);
    const live = store.filter((session) => session.status === 'active');

    expect(live).toHaveLength(1);
    expect(String(live[0]._id)).toBe(second.id);
    expect(
      store.find((session) => String(session._id) === first.id).status,
    ).toBe('ended');
    expect(sandbox.destroy).toHaveBeenCalledWith(first.sandboxId);
  });

  it('does not leak a sandbox when starts race across service instances', async () => {
    const originalCreate = sessionModel.create.getMockImplementation();
    sessionModel.create.mockImplementation(async (doc: any) => {
      const live = store.find(
        (item) =>
          String(item.userId) === String(doc.userId) &&
          ['provisioning', 'active'].includes(item.status),
      );
      if (live && ['provisioning', 'active'].includes(doc.status)) {
        const duplicate: any = new Error('duplicate live session');
        duplicate.code = 11000;
        throw duplicate;
      }
      return originalCreate!(doc);
    });

    const other = new ResumeHarnessService(
      sessionModel,
      modelAlias,
      candidateContext,
      (service as any).contextFiles,
      templates,
      (service as any).registry,
      sandbox,
      latex,
      storage,
    );

    let firstProvisionEnteredResolve!: () => void;
    let releaseFirstProvision!: () => void;
    const firstProvisionEntered = new Promise<void>((resolve) => {
      firstProvisionEnteredResolve = resolve;
    });
    const liveBoxes = new Set<string>();
    sandbox.provision
      .mockImplementationOnce(async () => {
        firstProvisionEnteredResolve();
        await new Promise<void>((resolve) => {
          releaseFirstProvision = resolve;
        });
        liveBoxes.add('sbx-first');
        return { sandboxId: 'sbx-first' };
      })
      .mockImplementationOnce(async () => {
        liveBoxes.add('sbx-second');
        return { sandboxId: 'sbx-second' };
      });
    sandbox.destroy.mockImplementation(async (sandboxId: string) => {
      liveBoxes.delete(sandboxId);
    });

    const first = service.startSession('u1', { harness: 'claude-code' });
    await firstProvisionEntered;
    const second = other.startSession('u1', { harness: 'codex' });
    const results = Promise.allSettled([first, second]);
    await new Promise<void>((resolve) => setImmediate(resolve));
    releaseFirstProvision();
    const [firstResult, secondResult] = await results;

    expect(firstResult.status).toBe('fulfilled');
    expect(secondResult.status).toBe('rejected');
    expect(liveBoxes.size).toBe(1);
    expect(store.filter((item) => item.status === 'active')).toHaveLength(1);
  });

  it('destroys a provisioned sandbox when binding it to the session fails', async () => {
    const originalCreate = sessionModel.create.getMockImplementation();
    sessionModel.create.mockImplementationOnce(async (doc: any) => {
      const saved = await originalCreate!(doc);
      saved.save.mockRejectedValueOnce(new Error('mongo unavailable'));
      return saved;
    });

    await expect(start()).rejects.toThrow('mongo unavailable');
    expect(sandbox.destroy).toHaveBeenCalledWith('sbx-1');
  });

  it('retires a stale provisioning claim before starting after a process crash', async () => {
    const stale = await createSession({
      userId: 'u1',
      harness: 'claude-code',
      status: 'provisioning',
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
    });
    sessionModel.create.mockImplementation(async (doc: any) => {
      if (
        ['provisioning', 'active'].includes(doc.status) &&
        store.some(
          (item) =>
            String(item.userId) === String(doc.userId) &&
            ['provisioning', 'active'].includes(item.status),
        )
      ) {
        const duplicate: any = new Error('duplicate live session');
        duplicate.code = 11000;
        throw duplicate;
      }
      return createSession(doc);
    });

    const next = await start();

    expect(stale.status).toBe('ended');
    expect(next.status).toBe('active');
  });

  it("does not replace another user's live sandbox", async () => {
    const mine = await start();
    const theirs = await service.startSession('u2', { harness: 'claude-code' });

    expect(sandbox.destroy).not.toHaveBeenCalled();
    expect(mine.status).toBe('active');
    expect(theirs.status).toBe('active');
  });

  it('provisions the sandbox with the context files the chosen harness reads', async () => {
    await start('codex');
    const codexFiles = sandbox.provision.mock.calls[0][0].files.map(
      (f: any) => f.path,
    );
    expect(codexFiles).toContain('AGENTS.md');
    expect(codexFiles).not.toContain('CLAUDE.md');

    sandbox.provision.mockClear();
    await start('claude-code');
    const claudeFiles = sandbox.provision.mock.calls[0][0].files.map(
      (f: any) => f.path,
    );
    expect(claudeFiles).toEqual(
      expect.arrayContaining(['AGENTS.md', 'CLAUDE.md']),
    );
  });

  it('tags the sandbox environment with the active harness for LiteLLM reporting', async () => {
    await start('opencode');
    const { env, files } = sandbox.provision.mock.calls[0][0];
    expect(JSON.stringify({ env, files })).toContain('harness=opencode');
    expect(LITELLM_TAG_HEADER).toBe('x-litellm-tags');
  });

  it('records the tier-resolved model and effort on the session', async () => {
    const session = await start();
    expect(modelAlias.resolveForUser).toHaveBeenCalledWith('u1', undefined);
    expect(session.model).toBe(ALIAS.model);
    expect(session.effort).toBe(ALIAS.effort);
    expect(session.alias).toBe(ALIAS.alias);
  });

  it('rejects an attempt to change harness on a live session', async () => {
    const session = await start('claude-code');

    await expect(
      service.runTurn('u1', session.id, {
        instruction: 'make it punchier',
        harness: 'codex',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    // The session is untouched - no sandbox rebind, no extra provision.
    expect(sandbox.provision).toHaveBeenCalledTimes(1);
  });

  it('updates the same artifact in place rather than regenerating from zero', async () => {
    const session = await start();

    sandbox.readFile.mockResolvedValueOnce(resumeDoc('v1'));
    const first = await service.runTurn('u1', session.id, {
      instruction: 'build me a resume',
    });
    expect(first.latex).toBe(resumeDoc('v1'));

    sandbox.readFile.mockResolvedValueOnce(resumeDoc('v2'));
    const second = await service.runTurn('u1', session.id, {
      instruction: 'shorten the summary',
    });

    expect(second.latex).toBe(resumeDoc('v2'));
    expect(second.revision).toBe(2);
    // Same sandbox, same file - never a fresh provision on update.
    expect(sandbox.provision).toHaveBeenCalledTimes(1);
    const execTargets = sandbox.exec.mock.calls.map((c: any[]) => c[0]);
    expect(new Set(execTargets)).toEqual(new Set(['sbx-1']));
  });

  it('treats the existing document as untrusted output on every update', async () => {
    const session = await start('opencode');

    await service.runTurn('u1', session.id, {
      instruction: 'create the first version',
    });

    await service.runTurn('u1', session.id, {
      instruction: 'make the presentation cleaner',
    });

    const command = JSON.stringify(sandbox.exec.mock.calls[1]);
    expect(command).toContain('CANDIDATE.md');
    expect(command).toMatch(/unsupported|untrusted/i);
  });

  it('fails the turn when the harness command exits non-zero instead of compiling stale output', async () => {
    const session = await start('opencode');
    sandbox.exec.mockResolvedValueOnce({
      exitCode: 1,
      stdout: '',
      stderr: 'model route failed',
    });

    await expect(
      service.runTurn('u1', session.id, { instruction: 'build it' }),
    ).rejects.toThrow(/model route failed/);
    expect(latex.compile).not.toHaveBeenCalled();
    expect(session.revision).toBe(0);
  });

  it('feeds a compile failure back to the harness instead of failing the request', async () => {
    const session = await start();
    latex.compile
      .mockResolvedValueOnce({
        ok: false,
        log: '! Undefined control sequence.',
        pdfBase64: '',
      } as any)
      .mockResolvedValueOnce({ ok: true, log: '', pdfBase64: 'JVBER' } as any);

    const result = await service.runTurn('u1', session.id, {
      instruction: 'build me a resume',
    });

    expect(result.compiled).toBe(true);
    // Two harness invocations: the original turn, then the self-correction.
    expect(sandbox.exec).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(sandbox.exec.mock.calls[1])).toContain(
      'Undefined control sequence',
    );
  });

  /**
   * The reported failure, end to end.
   *
   * A session reported "revision 1 · build passing" and then
   * "revision 2 · build passing", and the PDF contained the single line
   * `< newlycreatedresumecontent >`. The build genuinely did pass — filler
   * typesets as cleanly as a career — so the compiler could never have caught
   * it, and nothing else was looking.
   */
  const STUB = [
    '\\documentclass{article}',
    '\\begin{document}',
    '< newlycreatedresumecontent >',
    '\\end{document}',
  ].join('\n');

  it('treats a document that compiles but is still a placeholder as unfinished', async () => {
    const session = await start();
    sandbox.readFile.mockResolvedValueOnce(STUB);

    const result = await service.runTurn('u1', session.id, {
      instruction: 'build it',
    });

    // Two harness invocations: the original turn, then the content repair.
    expect(sandbox.exec).toHaveBeenCalledTimes(2);
    // And the repair names what was wrong rather than saying "try again".
    expect(JSON.stringify(sandbox.exec.mock.calls[1])).toContain(
      'newlycreatedresumecontent',
    );
    // The retry produced a real document, so nothing is left to warn about.
    expect(result.contentWarnings).toEqual([]);
  });

  it('repairs a career summary that is unsupported by a sparse candidate profile', async () => {
    const session = await start('opencode');
    const hallucinated = [
      '\\documentclass{article}',
      '\\begin{document}',
      'Jordan Reyes',
      '\\section*{Summary}',
      'Software engineering professional focused on technical solutions.',
      '\\end{document}',
    ].join('\n');
    const contactOnly = [
      '\\documentclass{article}',
      '\\begin{document}',
      'Jordan Reyes\\\\',
      'jordan@example.com',
      '\\end{document}',
    ].join('\n');
    sandbox.readFile
      .mockResolvedValueOnce(hallucinated)
      .mockResolvedValueOnce(contactOnly);

    const result = await service.runTurn('u1', session.id, {
      instruction: 'build it',
    });

    expect(sandbox.exec).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(sandbox.exec.mock.calls[1])).toMatch(
      /no career evidence/i,
    );
    expect(result.contentWarnings).toEqual([]);
  });

  it('records the problem rather than claiming success when it cannot be fixed', async () => {
    const session = await start();
    // Every read returns the stub: the harness never recovers.
    sandbox.readFile
      .mockResolvedValueOnce(STUB)
      .mockResolvedValueOnce(STUB)
      .mockResolvedValueOnce(STUB);

    const result = await service.runTurn('u1', session.id, {
      instruction: 'build it',
    });

    // The build really did pass, and saying otherwise would be a different lie.
    expect(result.compiled).toBe(true);
    // But the screen is told the document is not a résumé.
    expect(result.contentWarnings.length).toBeGreaterThan(0);
    expect(result.contentWarnings.join(' ')).toMatch(
      /newlycreatedresumecontent/,
    );
  });

  it('carries the artifact forward when starting a new session on another harness', async () => {
    const original = await start('claude-code');
    sandbox.readFile.mockResolvedValueOnce(resumeDoc('carried'));
    await service.runTurn('u1', original.id, { instruction: 'build it' });

    const next = await service.startSession('u1', {
      harness: 'codex',
      carryFromSessionId: original.id,
    });

    expect(next.harness).toBe('codex');
    expect(next.latex).toBe(resumeDoc('carried'));
    const seeded = sandbox.provision.mock.calls[1][0].files.find(
      (f: any) => f.path === 'resume.tex',
    );
    expect(seeded.contents).toBe(resumeDoc('carried'));
  });

  it('tears the sandbox down when the session ends and refuses further turns', async () => {
    const session = await start();
    await service.endSession('u1', session.id);

    expect(sandbox.destroy).toHaveBeenCalledWith('sbx-1');
    await expect(
      service.runTurn('u1', session.id, { instruction: 'again' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not leak the session of another user', async () => {
    const session = await start();
    await expect(
      service.runTurn('someone-else', session.id, { instruction: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
