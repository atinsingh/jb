import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { ResumeHarnessService } from '../resume-harness.service';
import { ModelAliasService } from '../model-alias.service';
import { CandidateContextService } from '../candidate-context.service';
import { ContextFilesService } from '../context-files.service';
import { HarnessRegistry } from '../harness/harness.registry';
import { SandboxService } from '../sandbox/sandbox.service';
import { LatexService } from '../latex/latex.service';
import { ResumeHarnessSession } from '../schemas/resume-harness-session.schema';
import { LITELLM_TAG_HEADER } from '../harness/harness.types';

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
  const sessionModel: any = {
    create: jest.fn(async (doc: any) => {
      const saved = {
        ...doc,
        _id: `sess-${store.length + 1}`,
        save: jest.fn(async function (this: any) {
          return this;
        }),
      };
      store.push(saved);
      return saved;
    }),
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
    provision: jest.fn(async () => ({ sandboxId: 'sbx-1' })),
    writeFiles: jest.fn(async () => undefined),
    readFile: jest.fn(async () => 'TEX'),
    exec: jest.fn(async () => ({ exitCode: 0, stdout: 'ok', stderr: '' })),
    destroy: jest.fn(async () => undefined),
  };

  const latex: any = {
    compile: jest.fn(async () => ({ ok: true, log: '', pdfBase64: 'JVBER' })),
  };

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

  beforeEach(async () => {
    store = [];
    jest.clearAllMocks();

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
        { provide: ModelAliasService, useValue: modelAlias },
        { provide: CandidateContextService, useValue: candidateContext },
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

    sandbox.readFile.mockResolvedValueOnce('TEX v1');
    const first = await service.runTurn('u1', session.id, {
      instruction: 'build me a resume',
    });
    expect(first.latex).toBe('TEX v1');

    sandbox.readFile.mockResolvedValueOnce('TEX v2');
    const second = await service.runTurn('u1', session.id, {
      instruction: 'shorten the summary',
    });

    expect(second.latex).toBe('TEX v2');
    expect(second.revision).toBe(2);
    // Same sandbox, same file - never a fresh provision on update.
    expect(sandbox.provision).toHaveBeenCalledTimes(1);
    const execTargets = sandbox.exec.mock.calls.map((c: any[]) => c[0]);
    expect(new Set(execTargets)).toEqual(new Set(['sbx-1']));
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

  it('carries the artifact forward when starting a new session on another harness', async () => {
    const original = await start('claude-code');
    sandbox.readFile.mockResolvedValueOnce('CARRIED TEX');
    await service.runTurn('u1', original.id, { instruction: 'build it' });

    const next = await service.startSession('u1', {
      harness: 'codex',
      carryFromSessionId: original.id,
    });

    expect(next.harness).toBe('codex');
    expect(next.latex).toBe('CARRIED TEX');
    const seeded = sandbox.provision.mock.calls[1][0].files.find(
      (f: any) => f.path === 'resume.tex',
    );
    expect(seeded.contents).toBe('CARRIED TEX');
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
