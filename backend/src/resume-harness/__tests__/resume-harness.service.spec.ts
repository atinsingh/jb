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
import { JobDescriptionResolverService } from '../job-description-resolver.service';

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

const LUNA_ALIAS = {
  alias: 'openai/gpt-5.6-luna/high',
  provider: 'openai',
  model: 'gpt-5.6-luna',
  effort: 'high',
  label: 'GPT-5.6 Luna · high',
};

const CODEX_ALIAS = {
  alias: 'openai/gpt-5.1-codex/high',
  provider: 'openai',
  model: 'gpt-5.1-codex',
  effort: 'high',
  label: 'GPT-5.1 Codex · high',
};

const OPENCODE_ALIAS = {
  alias: 'bedrock/qwen3-coder-next/low',
  provider: 'bedrock',
  model: 'qwen3-coder-next',
  effort: 'low',
  label: 'Qwen3 Coder Next · low',
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
          if (q.updatedAt?.$lt && !(d.updatedAt < q.updatedAt.$lt))
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
    updateOne: jest.fn((q: any, update: any) => ({
      exec: async () => {
        const found = store.find(
          (d) =>
            String(d._id) === String(q._id) &&
            String(d.userId) === String(q.userId),
        );
        if (found) {
          Object.assign(found, update.$set || {});
          for (const key of Object.keys(update.$unset || {})) delete found[key];
        }
        return { acknowledged: true, modifiedCount: found ? 1 : 0 };
      },
    })),
    deleteOne: jest.fn((q: any) => ({
      exec: async () => {
        const before = store.length;
        store = store.filter(
          (d) =>
            !(
              String(d._id) === String(q._id) &&
              String(d.userId) === String(q.userId)
            ),
        );
        return { acknowledged: true, deletedCount: before - store.length };
      },
    })),
  };

  const sandbox: any = {
    provision: jest.fn(async () => ({ sandboxId: `sbx-${++boxSeq}` })),
    writeFiles: jest.fn(async () => undefined),
    readFile: jest.fn(async () => resumeDoc('base')),
    exec: jest.fn(async () => ({ exitCode: 0, stdout: 'ok', stderr: '' })),
    execStream: jest.fn(),
    destroy: jest.fn(async () => undefined),
  };

  const latex: any = {
    compile: jest.fn(async () => ({ ok: true, log: '', pdfBase64: 'JVBER' })),
  };
  const storage: any = {
    put: jest.fn(async () => ({})),
    getBuffer: jest.fn(async () => Buffer.from('%PDF')),
    delete: jest.fn(async () => undefined),
  };

  const modelAlias: any = {
    resolveForUser: jest.fn(async () => ALIAS),
    resolveSelectionForUser: jest.fn(async () => LUNA_ALIAS),
    listForUser: jest.fn(async () => [ALIAS]),
    capabilitiesForUser: jest.fn(async () => []),
  };

  const candidateContext: any = {
    build: jest.fn(async () => ({
      markdown: [
        '# Candidate facts',
        '',
        '## Identity',
        '',
        '- Name: Jordan Reyes',
        '',
        '## Experience',
        '',
        '### Staff Engineer — Stripe',
        '2019 – 2024',
      ].join('\n'),
      missing: [],
      hasEnoughToGenerate: true,
      summary: { name: 'Jordan Reyes', roles: [] },
    })),
  };

  const jobDescriptions: any = {
    resolve: jest.fn(async () => ({
      description:
        'Platform Engineer\n\nBuild Kubernetes platforms with Terraform.',
      finalUrl: 'https://jobs.example.com/platform-engineer',
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
        { provide: JobDescriptionResolverService, useValue: jobDescriptions },
      ],
    }).compile();

    service = module.get(ResumeHarnessService);
  });

  const aliasForHarness = (harness: string) =>
    harness === 'codex'
      ? CODEX_ALIAS
      : harness === 'opencode'
        ? OPENCODE_ALIAS
        : ALIAS;

  const startWith = (
    target: ResumeHarnessService,
    userId: string,
    harness: string,
    input: Record<string, unknown> = {},
  ) => {
    const selected = aliasForHarness(harness);
    modelAlias.resolveSelectionForUser.mockResolvedValueOnce(selected);
    return target.startSession(userId, {
      model: selected.model,
      effort: selected.effort,
      ...input,
    } as any);
  };

  const start = (harness: any = 'claude-code', input = {}) =>
    startWith(service, 'u1', harness, input);

  it('persists Luna selection and routes its sandbox through Codex', async () => {
    modelAlias.resolveSelectionForUser.mockResolvedValueOnce(LUNA_ALIAS);
    const session = await service.startSession('u1', {
      model: 'gpt-5.6-luna',
      effort: 'high',
    } as any);

    expect(modelAlias.resolveSelectionForUser).toHaveBeenCalledWith(
      'u1',
      'gpt-5.6-luna',
      'high',
    );
    expect(session).toMatchObject({
      model: 'gpt-5.6-luna',
      effort: 'high',
    });
    expect(session).not.toHaveProperty('harness');
    expect(session).not.toHaveProperty('provider');
    expect(session).not.toHaveProperty('alias');
    expect(store[0]).toMatchObject({
      harness: 'codex',
      provider: 'openai',
      model: 'gpt-5.6-luna',
      effort: 'high',
      alias: 'openai/gpt-5.6-luna/high',
    });
    expect(sandbox.provision).toHaveBeenCalledWith(
      expect.objectContaining({ harness: 'codex' }),
    );
  });

  it('prefers pasted job text and does not fetch the supplied job URL', async () => {
    const session = await start('codex', {
      jobUrl: 'https://jobs.example.com/platform-engineer',
      jobDescription: 'Pasted role requirements',
    });

    expect(jobDescriptions.resolve).not.toHaveBeenCalled();
    expect(session).toMatchObject({
      jobUrl: 'https://jobs.example.com/platform-engineer',
      jobDescription: 'Pasted role requirements',
    });
  });

  it('extracts job text from a URL without blocking session creation', async () => {
    const session = await start('codex', {
      jobUrl: 'https://jobs.example.com/platform-engineer',
    });

    expect(jobDescriptions.resolve).toHaveBeenCalledWith(
      'https://jobs.example.com/platform-engineer',
    );
    expect(session).toMatchObject({
      jobUrl: 'https://jobs.example.com/platform-engineer',
      jobDescription:
        'Platform Engineer\n\nBuild Kubernetes platforms with Terraform.',
    });
    expect(session.jobContextWarning).toBeUndefined();
  });

  it('starts normally and exposes one warning when URL extraction fails', async () => {
    jobDescriptions.resolve.mockResolvedValueOnce({
      finalUrl: 'https://jobs.example.com/protected',
      warning: 'We could not read that job URL. Paste the description.',
    });

    const session = await start('codex', {
      jobUrl: 'https://jobs.example.com/protected',
    });

    expect(session.status).toBe('active');
    expect(session.jobDescription).toBeUndefined();
    expect(session.jobContextWarning).toBe(
      'We could not read that job URL. Paste the description.',
    );
  });

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

    modelAlias.resolveSelectionForUser
      .mockResolvedValueOnce(ALIAS)
      .mockResolvedValueOnce(CODEX_ALIAS);
    const first = service.startSession('u1', {
      model: ALIAS.model,
      effort: ALIAS.effort,
    });
    await firstProvisionEntered;
    const second = other.startSession('u1', {
      model: CODEX_ALIAS.model,
      effort: CODEX_ALIAS.effort,
    });
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
    const theirs = await startWith(service, 'u2', 'claude-code');

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

  it('gives in-sandbox ATS tooling the same LiteLLM route and credential as generation', async () => {
    const oldUrl = process.env.RESUME_HARNESS_LITELLM_INTERNAL_URL;
    const oldKey = process.env.RESUME_HARNESS_LITELLM_KEY;
    process.env.RESUME_HARNESS_LITELLM_INTERNAL_URL = 'http://litellm:4000';
    process.env.RESUME_HARNESS_LITELLM_KEY = 'sk-one-user-key';
    try {
      await start('codex');
      const { env } = sandbox.provision.mock.calls[0][0];
      expect(env.JOBOCATE_LITELLM_BASE_URL).toBe('http://litellm:4000');
      expect(env.JOBOCATE_LITELLM_API_KEY).toBe('sk-one-user-key');
    } finally {
      if (oldUrl === undefined)
        delete process.env.RESUME_HARNESS_LITELLM_INTERNAL_URL;
      else process.env.RESUME_HARNESS_LITELLM_INTERNAL_URL = oldUrl;
      if (oldKey === undefined) delete process.env.RESUME_HARNESS_LITELLM_KEY;
      else process.env.RESUME_HARNESS_LITELLM_KEY = oldKey;
    }
  });

  it('records the tier-resolved model and effort on the session', async () => {
    const session = await start();
    expect(modelAlias.resolveSelectionForUser).toHaveBeenCalledWith(
      'u1',
      ALIAS.model,
      ALIAS.effort,
    );
    expect(session.model).toBe(ALIAS.model);
    expect(session.effort).toBe(ALIAS.effort);
    expect(store[0].alias).toBe(ALIAS.alias);
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

  it('records a conversational answer without creating a document revision', async () => {
    const session = await start('opencode');
    sandbox.readFile.mockResolvedValueOnce(resumeDoc('v1'));
    await service.runTurn('u1', session.id, {
      instruction: 'Build my résumé.',
    });

    sandbox.exec.mockResolvedValueOnce({
      exitCode: 0,
      stdout: [
        JSON.stringify({
          type: 'text',
          part: { type: 'text', text: 'I will inspect the résumé.' },
        }),
        JSON.stringify({
          type: 'tool_use',
          part: {
            type: 'tool',
            tool: 'read',
            state: { status: 'completed', title: 'Read resume.tex' },
          },
        }),
        JSON.stringify({
          type: 'text',
          part: {
            type: 'text',
            text: 'I can tailor the summary, reorder supported sections, and tighten the layout. Tell me which role you want to emphasize.',
          },
        }),
      ].join('\n'),
      stderr: '',
    });
    sandbox.readFile.mockResolvedValueOnce(resumeDoc('v1'));

    const answer = await service.runTurn('u1', session.id, {
      instruction: 'What else can you do?',
    });

    expect(answer.revision).toBe(1);
    expect(answer.documentChanged).toBe(false);
    expect(answer.summary).toContain('I can tailor the summary');
    expect(answer.summary).toContain('Tell me which role');
    expect(answer.summary).not.toContain('I will inspect');
    expect(answer.turns).toHaveLength(1);
    expect(answer.conversation.slice(-2)).toMatchObject([
      { role: 'user', text: 'What else can you do?' },
      {
        role: 'assistant',
        text: expect.stringContaining('I can tailor the summary'),
        revision: undefined,
      },
    ]);
    expect(latex.compile).toHaveBeenCalledTimes(1);
  });

  it('reaps an idle candidate sandbox but keeps a recently used session', async () => {
    const old = await startWith(service, 'u1', 'opencode');
    const recent = await startWith(service, 'u2', 'opencode');
    store.find((session) => session._id === old.id).updatedAt = new Date('2026-09-17T12:00:00Z');
    store.find((session) => session._id === recent.id).updatedAt = new Date('2026-09-17T12:19:00Z');

    const reaped = await service.reapIdleSessions(new Date('2026-09-17T12:20:00Z'));

    expect(reaped).toBe(1);
    expect(sandbox.destroy).toHaveBeenCalledWith(old.sandboxId);
    expect(sandbox.destroy).not.toHaveBeenCalledWith(recent.sandboxId);
    expect((await service.getSession('u1', old.id)).status).toBe('ended');
    expect((await service.getSession('u2', recent.id)).status).toBe('active');
  });

  it('does not invoke a turn if idle cleanup claimed its sandbox first', async () => {
    const session = await startWith(service, 'u1', 'opencode');
    sessionModel.updateOne.mockReturnValueOnce({
      exec: async () => ({ matchedCount: 0, modifiedCount: 0 }),
    });

    await expect(service.runTurn('u1', session.id, { instruction: 'Build a résumé.' }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(sandbox.exec).not.toHaveBeenCalled();
  });

  it('keeps the candidate container while a turn is running', async () => {
    const session = await startWith(service, 'u1', 'opencode');
    store[0].updatedAt = new Date(Date.now() - 20 * 60 * 1000);
    let finishTurn!: (result: any) => void;
    let started!: () => void;
    const running = new Promise<void>((resolve) => { started = resolve; });
    sandbox.exec.mockImplementationOnce(() => new Promise((resolve) => {
      finishTurn = resolve;
      started();
    }));

    const turn = service.runTurn('u1', session.id, { instruction: 'Build a résumé.' });
    await running;
    expect(await service.reapIdleSessions()).toBe(0);
    expect(sandbox.destroy).not.toHaveBeenCalled();
    finishTurn({ exitCode: 0, stdout: 'Done', stderr: '' });
    await turn;
  });

  it('asks every harness to answer a first-turn question without creating a résumé', async () => {
    for (const harness of ['opencode', 'claude-code', 'codex']) {
      const session = await start(harness);
      sandbox.exec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: harness === 'opencode'
          ? JSON.stringify({ type: 'text', part: { type: 'text', text: 'I can help with your résumé.' } })
          : 'I can help with your résumé.',
        stderr: '',
      });
      sandbox.readFile.mockResolvedValueOnce(null);

      const answer = await service.runTurn('u1', session.id, {
        instruction: 'What can you do?',
      });

      const command = sandbox.exec.mock.calls.at(-1)?.[1]?.join(' ') || '';
      expect(command).toMatch(/answer.*question.*without.*edit/i);
      expect(command).not.toMatch(/Create resume\.tex from scratch/i);
      expect(answer.revision).toBe(0);
      expect(answer.documentChanged).toBe(false);
    }
    expect(latex.compile).not.toHaveBeenCalled();
  });

  it('streams normalized actions and assistant text across split and unterminated JSONL records', async () => {
    const session = await start('opencode');
    const records = [
      JSON.stringify({ type: 'tool_use', part: { type: 'tool', callID: 'read-1', tool: 'read', state: { status: 'running' } } }),
      JSON.stringify({ type: 'tool_use', part: { type: 'tool', callID: 'read-1', tool: 'read', state: { status: 'completed' } } }),
      JSON.stringify({ type: 'text', part: { type: 'text', text: 'I can help with your résumé.' } }),
    ];
    const output = records.join('\n');
    sandbox.execStream.mockImplementationOnce(async (_id: string, _command: string[], onChunk: (chunk: string) => void) => {
      onChunk(output.slice(0, 31));
      onChunk(output.slice(31));
      return { exitCode: 0, stdout: output, stderr: '' };
    });
    sandbox.readFile.mockResolvedValueOnce(null);
    const events: any[] = [];

    const answer = await service.runTurnStreaming('u1', session.id, {
      instruction: 'What can you do?',
    }, (event) => events.push(event));

    expect(events).toEqual(expect.arrayContaining([
      { type: 'activity', activity: { id: 'read-1', kind: 'tool', label: 'Read', status: 'running' } },
      { type: 'activity', activity: { id: 'read-1', kind: 'tool', label: 'Read', status: 'completed' } },
      { type: 'token', text: 'I can help with your résumé.' },
    ]));
    expect(answer.summary).toBe('I can help with your résumé.');
    expect(answer.conversation.at(-1)).toMatchObject({
      role: 'assistant',
      activities: [{ id: 'read-1', kind: 'tool', label: 'Read', status: 'completed' }],
    });
  });

  it('does not create a revision or repeat a false success when repair restores the previous source', async () => {
    const session = await start('opencode');
    sandbox.readFile.mockResolvedValueOnce(resumeDoc('v1'));
    await service.runTurn('u1', session.id, {
      instruction: 'Build my résumé.',
    });

    sandbox.exec.mockResolvedValueOnce({
      exitCode: 0,
      stdout: JSON.stringify({
        type: 'text',
        part: {
          type: 'text',
          text: 'Done. I tailored the résumé and built the PDF.',
        },
      }),
      stderr: '',
    });
    sandbox.readFile
      .mockResolvedValueOnce(STUB)
      .mockResolvedValueOnce(resumeDoc('v1'));

    const result = await service.runTurn('u1', session.id, {
      instruction: 'Tailor it more closely to the job.',
    });

    expect(result.revision).toBe(1);
    expect(result.documentChanged).toBe(false);
    expect(result.turns).toHaveLength(1);
    expect(result.summary).toMatch(/saved resume\.tex is unchanged/i);
    expect(result.summary).not.toMatch(/done|tailored the résumé/i);
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
    expect(sandbox.exec).toHaveBeenCalledWith(
      expect.any(String), expect.any(Array), expect.objectContaining({ timeoutSeconds: 120 }),
    );
    expect(latex.compile).not.toHaveBeenCalled();
    expect(session.revision).toBe(0);
  });

  it('surfaces the structured Codex failure ahead of its generic stdin diagnostic', async () => {
    await start('codex');
    sandbox.exec.mockResolvedValueOnce({
      exitCode: 1,
      stdout: JSON.stringify({ type: 'turn.failed', error: { message: 'Model unavailable for this account' } }),
      stderr: 'Reading additional input from stdin...',
    });
    await expect(service.runTurn('u1', 'sess-1', { instruction: 'Build it' }))
      .rejects.toThrow(/Model unavailable for this account/);
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

  const PLACEHOLDER_DRAFT = [
    '\\documentclass{article}',
    '\\begin{document}',
    'Jordan Reyes',
    '\\section*{Summary}',
    '[Your professional summary]',
    '\\section*{Experience}',
    '[Your role, company, dates, and achievements]',
    '\\section*{Skills}',
    '[Your skills]',
    '\\section*{Education}',
    '[Your degree and school]',
    '\\end{document}',
  ].join('\n');

  it('preserves and renders a placeholder draft when the candidate has no career facts', async () => {
    candidateContext.build.mockResolvedValueOnce({
      markdown: '# Candidate facts\n\n## Identity\n\n- Name: Jordan Reyes\n',
      missing: [],
      optionalGaps: ['experience', 'education', 'skills'],
      hasEnoughToGenerate: true,
      summary: { name: 'Jordan Reyes', roles: [] },
    });
    const session = await start('opencode');
    sandbox.readFile.mockResolvedValueOnce(PLACEHOLDER_DRAFT);

    const result = await service.runTurn('u1', session.id, {
      instruction: 'Generate my résumé based on the job description.',
    });

    expect(result.revision).toBe(1);
    expect(result.documentChanged).toBe(true);
    expect(result.latex).toContain('[Your professional summary]');
    expect(result.pdfBase64).toBe('JVBER');
    expect(result.hasCurrentPdf).toBe(true);
    expect(result.contentWarnings.length).toBeGreaterThan(0);
    expect(await service.getPdf('u1', session.id)).toBe('JVBERg==');
  });

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

  it('does not publish a career summary from a sparse candidate profile', async () => {
    candidateContext.build.mockResolvedValueOnce({
      markdown: '# Candidate facts\n\n## Identity\n\n- Name: Jordan Reyes\n',
      missing: [],
      optionalGaps: ['experience', 'education', 'skills'],
      hasEnoughToGenerate: true,
      summary: { name: 'Jordan Reyes', roles: [] },
    });
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
    expect(result.contentWarnings.join(' ')).toMatch(/no career facts/i);
    expect(result.pdfBase64).toBeUndefined();
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

  it('does not publish a contact-only PDF as a completed resume', async () => {
    candidateContext.build.mockResolvedValueOnce({
      markdown: '# Candidate facts\n\n## Identity\n\n- Name: Jordan Reyes\n',
      missing: [],
      optionalGaps: ['experience', 'education', 'skills'],
      hasEnoughToGenerate: true,
      summary: { name: 'Jordan Reyes', roles: [] },
    });
    const session = await start();
    const contactOnly = [
      '\\documentclass{article}',
      '\\begin{document}',
      'Jordan Reyes\\\\',
      'jordan@example.com',
      '\\end{document}',
    ].join('\n');
    sandbox.readFile.mockResolvedValue(contactOnly);

    const result = await service.runTurn('u1', session.id, {
      instruction: 'build it',
    });

    expect(result.contentWarnings.join(' ')).toMatch(/no career facts/i);
    expect(result.pdfBase64).toBeUndefined();
    expect(result.hasCurrentPdf).toBe(false);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('withholds an already stored contact-only PDF when the session is read', async () => {
    candidateContext.build.mockResolvedValueOnce({
      markdown: '# Candidate facts\n\n## Identity\n\n- Name: Jordan Reyes\n',
      missing: [],
      optionalGaps: ['experience', 'education', 'skills'],
      hasEnoughToGenerate: true,
      summary: { name: 'Jordan Reyes', roles: [] },
    });
    const started = await start();
    const stored = store.find((item) => String(item._id) === started.id);
    stored.latex = [
      '\\documentclass{article}',
      '\\begin{document}',
      'Jordan Reyes\\\\',
      'jordan@example.com',
      '\\end{document}',
    ].join('\n');
    stored.compiled = true;
    stored.pdfKey = 'resume-harness/u1/sess-1/revisions/1.pdf';
    stored.revision = 1;
    stored.contentWarnings = [];

    const current = await service.getSession('u1', started.id);

    expect(current.contentWarnings.join(' ')).toMatch(/no career facts/i);
    expect(current.hasCurrentPdf).toBe(false);
    await expect(service.getPdf('u1', started.id)).resolves.toBeNull();
    expect(storage.getBuffer).not.toHaveBeenCalled();
  });

  it('carries the artifact forward when starting a new session on another harness', async () => {
    const original = await start('claude-code');
    sandbox.readFile.mockResolvedValueOnce(resumeDoc('carried'));
    await service.runTurn('u1', original.id, { instruction: 'build it' });

    const next = await start('codex', {
      carryFromSessionId: original.id,
    });

    expect(store.find((item) => String(item._id) === next.id).harness).toBe(
      'codex',
    );
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

  it('archives and restores the generated resume together with its session', async () => {
    const session = await start();
    const stored = store.find((item) => String(item._id) === session.id);
    stored.turns = [{ revision: 1, instruction: 'Legacy revision' }];
    stored.save.mockClear();
    stored.save.mockRejectedValue(
      new Error('turns.0.kind: Path `kind` is required.'),
    );

    const archived = await service.archiveSession('u1', session.id);

    expect(sandbox.destroy).toHaveBeenCalledWith('sbx-1');
    expect(archived.status).toBe('ended');
    expect(archived.archivedAt).toBeInstanceOf(Date);
    expect(archived.sandboxId).toBeUndefined();
    expect(stored.save).not.toHaveBeenCalled();

    const restored = await service.restoreSession('u1', session.id);

    expect(restored.archivedAt).toBeUndefined();
    expect(restored.status).toBe('ended');
    expect(restored.revisionCount).toBe(1);
    expect(stored.save).not.toHaveBeenCalled();
  });

  it('permanently deletes an older active session without validating legacy turns', async () => {
    const session = await start();
    const stored = store.find((item) => String(item._id) === session.id);
    stored.turns = [{ revision: 1, instruction: 'Legacy revision' }];
    stored.save.mockClear();
    stored.save.mockRejectedValue(
      new Error('turns.0.kind: Path `kind` is required.'),
    );

    await expect(service.deleteSession('u1', session.id)).resolves.toEqual({
      deleted: true,
    });

    expect(sandbox.destroy).toHaveBeenCalledWith('sbx-1');
    expect(stored.save).not.toHaveBeenCalled();
    expect(sessionModel.updateOne).toHaveBeenCalledWith(
      { _id: session.id, userId: 'u1' },
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'ended' }),
        $unset: { sandboxId: 1 },
      }),
    );
    expect(store).toHaveLength(0);
  });

  it('does not leak the session of another user', async () => {
    const session = await start();
    await expect(
      service.runTurn('someone-else', session.id, { instruction: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
