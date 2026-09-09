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
import { StorageService } from '../../storage/storage.service';

/**
 * Template selection and in-session vibe changes.
 *
 * The rule these tests exist for: the harness must never run a turn against a
 * stale condition. The context files are rewritten *before* the re-apply turn
 * is issued, and if that write fails nothing about the session moves — no
 * snapshot, no new template, no turn, no spend.
 *
 * The second rule is that a look change is a presentation change. Switching
 * template rewrites the skeleton, never the facts, and the pre-switch source is
 * snapshotted because JOB-98 keeps only the current revision — without that,
 * one bad re-apply would destroy the only copy of the résumé.
 */

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
  alias: 'bedrock/nova-micro/low',
  provider: 'bedrock',
  model: 'nova-micro',
  effort: 'low',
  label: 'Nova Micro · cheapest',
};

const CLASSIC: any = {
  key: 'classic-serif',
  name: 'Classic Serif',
  description: 'Traditional, centred header.',
  skeleton: '% classic skeleton',
  constraints: ['Keep the centred header.'],
  knobs: [
    {
      key: 'density',
      label: 'Density',
      defaultValue: 'balanced',
      options: [
        { value: 'balanced', label: 'Balanced', directive: 'Default spacing.' },
        { value: 'compact', label: 'Compact', directive: 'Tighten spacing.' },
      ],
    },
  ],
};

const MODERN: any = {
  ...CLASSIC,
  key: 'modern-sans',
  name: 'Modern Sans',
  skeleton: '% modern skeleton',
};

const TEMPLATES: Record<string, any> = {
  'classic-serif': CLASSIC,
  'modern-sans': MODERN,
};

describe('ResumeHarnessService — template and vibe', () => {
  let service: ResumeHarnessService;
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
    find: jest.fn((q: any) => ({
      exec: async () =>
        store.filter((d) => {
          if (q.userId != null && String(d.userId) !== String(q.userId)) {
            return false;
          }
          if (q.status != null && d.status !== q.status) return false;
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
    provision: jest.fn(async () => ({ sandboxId: 'sbx-1' })),
    writeFiles: jest.fn(async () => undefined),
    readFile: jest.fn(async () => resumeDoc('base')),
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
      markdown: '# Candidate facts\n',
      missing: [],
      hasEnoughToGenerate: true,
      summary: { name: 'Jordan Reyes', roles: [] },
    })),
  };

  /** Stands in for the collection-backed service: same contract, no Mongo. */
  const templates: any = {
    list: jest.fn(async () => Object.values(TEMPLATES)),
    resolve: jest.fn(async (key: string | undefined, vibe: any, base: any) => {
      const template = TEMPLATES[key || base?.templateKey || 'classic-serif'];
      if (!template) throw new NotFoundException('no such template');
      return {
        template,
        vibe: {
          density: vibe?.density || base?.vibe?.density || 'balanced',
        },
      };
    }),
    condition: jest.fn((template: any, vibe: any) => ({
      key: template.key,
      name: template.name,
      description: template.description,
      skeleton: template.skeleton,
      constraints: template.constraints,
      look: [
        {
          key: 'density',
          label: 'Density',
          choice: vibe.density,
          choiceLabel: vibe.density,
          directive: `spacing: ${vibe.density}`,
        },
      ],
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
        { provide: StorageService, useValue: { put: jest.fn(async () => ({})), getBuffer: jest.fn(async () => Buffer.from('%PDF')) } },
        { provide: ModelAliasService, useValue: modelAlias },
        { provide: CandidateContextService, useValue: candidateContext },
        { provide: ResumeTemplateService, useValue: templates },
      ],
    }).compile();

    service = module.get(ResumeHarnessService);
  });

  /** A session that already has a résumé, which is what a look change acts on. */
  const startGenerated = async (harness: any = 'codex') => {
    const session = await service.startSession('u1', { harness });
    sandbox.readFile.mockResolvedValueOnce(resumeDoc('v1'));
    await service.runTurn('u1', session.id, { instruction: 'build it' });
    return session;
  };

  it('seeds the sandbox with the template skeleton and its condition at session start', async () => {
    const session = await service.startSession('u1', {
      harness: 'codex',
      templateKey: 'modern-sans',
    });

    expect(session.templateKey).toBe('modern-sans');

    const files = sandbox.provision.mock.calls[0][0].files;
    expect(
      files.find((f: any) => f.path === 'TEMPLATE.tex').contents,
    ).toContain('% modern skeleton');
    expect(files.find((f: any) => f.path === 'AGENTS.md').contents).toContain(
      'Modern Sans',
    );
  });

  it('rewrites the context files before the re-apply turn is issued', async () => {
    const session = await startGenerated();
    sandbox.writeFiles.mockClear();
    sandbox.exec.mockClear();

    await service.selectTemplate('u1', session.id, {
      templateKey: 'modern-sans',
    });

    const files = sandbox.writeFiles.mock.calls[0][1];
    expect(files.map((f: any) => f.path)).toEqual(
      expect.arrayContaining(['AGENTS.md', 'TEMPLATE.tex']),
    );
    expect(
      files.find((f: any) => f.path === 'TEMPLATE.tex').contents,
    ).toContain('% modern skeleton');

    // The condition is on disk before the harness is asked to honour it.
    expect(sandbox.writeFiles.mock.invocationCallOrder[0]).toBeLessThan(
      sandbox.exec.mock.invocationCallOrder[0],
    );
  });

  it('writes CLAUDE.md on a look change only for a Claude Code session', async () => {
    const claude = await startGenerated('claude-code');
    sandbox.writeFiles.mockClear();
    await service.applyVibe('u1', claude.id, { vibe: { density: 'compact' } });
    expect(
      sandbox.writeFiles.mock.calls[0][1].map((f: any) => f.path),
    ).toContain('CLAUDE.md');

    const codex = await startGenerated('codex');
    sandbox.writeFiles.mockClear();
    await service.applyVibe('u1', codex.id, { vibe: { density: 'compact' } });
    const paths = sandbox.writeFiles.mock.calls[0][1].map((f: any) => f.path);
    expect(paths).toContain('AGENTS.md');
    expect(paths).not.toContain('CLAUDE.md');
  });

  it('snapshots the current résumé so the previous look can be restored', async () => {
    const session = await startGenerated();

    sandbox.readFile.mockResolvedValueOnce(resumeDoc('v2 modern'));
    const applied = await service.selectTemplate('u1', session.id, {
      templateKey: 'modern-sans',
    });
    expect(applied.latex).toBe(resumeDoc('v2 modern'));
    expect(applied.templateKey).toBe('modern-sans');
    expect(applied.canRevert).toBe(true);

    const reverted = await service.revertLook('u1', session.id);
    expect(reverted.latex).toBe(resumeDoc('v1'));
    expect(reverted.templateKey).toBe('classic-serif');
    // One level of undo only — JOB-105 owns full revision history.
    expect(reverted.canRevert).toBe(false);
  });

  it('restores the previous look without spending another harness turn', async () => {
    const session = await startGenerated();
    await service.selectTemplate('u1', session.id, {
      templateKey: 'modern-sans',
    });

    const harnessCalls = sandbox.exec.mock.calls.length;
    await service.revertLook('u1', session.id);

    // The old source is already known-good: put it back and rebuild rather than
    // asking a model to reconstruct it.
    expect(sandbox.exec.mock.calls.length).toBe(harnessCalls);
    expect(sandbox.writeFiles).toHaveBeenCalledWith(
      'sbx-1',
      expect.arrayContaining([expect.objectContaining({ path: 'resume.tex' })]),
    );
  });

  it('leaves the session on its old condition when the file write fails', async () => {
    const session = await startGenerated();
    const before = await service.getSession('u1', session.id);

    sandbox.writeFiles.mockRejectedValueOnce(new Error('docker cp failed'));
    sandbox.exec.mockClear();

    await expect(
      service.selectTemplate('u1', session.id, { templateKey: 'modern-sans' }),
    ).rejects.toThrow(/docker cp failed/);

    const after = await service.getSession('u1', session.id);
    expect(after.templateKey).toBe(before.templateKey);
    expect(after.revision).toBe(before.revision);
    expect(after.canRevert).toBe(false);
    // No turn was issued against a condition that never reached the sandbox.
    expect(sandbox.exec).not.toHaveBeenCalled();
  });

  it('rejects a look change on a session that has ended', async () => {
    const session = await startGenerated();
    await service.endSession('u1', session.id);

    await expect(
      service.selectTemplate('u1', session.id, { templateKey: 'modern-sans' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses to revert when there is nothing to go back to', async () => {
    const session = await startGenerated();
    await expect(service.revertLook('u1', session.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('carries template and vibe onto a new session on a different harness', async () => {
    const first = await service.startSession('u1', {
      harness: 'claude-code',
      templateKey: 'modern-sans',
      vibe: { density: 'compact' },
    });
    sandbox.readFile.mockResolvedValueOnce(resumeDoc('carried'));
    await service.runTurn('u1', first.id, { instruction: 'build it' });

    const next = await service.startSession('u1', {
      harness: 'opencode',
      carryFromSessionId: first.id,
    });

    expect(next.harness).toBe('opencode');
    expect(next.templateKey).toBe('modern-sans');
    expect(next.vibe).toEqual({ density: 'compact' });
    expect(next.latex).toBe(resumeDoc('carried'));

    // The new sandbox is correct from its first turn, not after one.
    const files = sandbox.provision.mock.calls[1][0].files;
    expect(
      files.find((f: any) => f.path === 'TEMPLATE.tex').contents,
    ).toContain('% modern skeleton');
    expect(files.find((f: any) => f.path === 'AGENTS.md').contents).toContain(
      'spacing: compact',
    );
  });

  it('changes the condition without a turn when there is no résumé yet', async () => {
    // The candidate started a session and changed their mind about the
    // template before pressing Generate. Writing the new condition is the whole
    // operation; running a turn here would bill them for a document they never
    // asked for, and would leave an empty snapshot for "back" to restore.
    const session = await service.startSession('u1', {
      harness: 'codex',
      templateKey: 'classic-serif',
    });
    sandbox.exec.mockClear();
    sandbox.writeFiles.mockClear();

    const result = await service.selectTemplate('u1', session.id, {
      templateKey: 'modern-sans',
    });

    // The condition still reached the sandbox — the next Generate honours it.
    expect(sandbox.writeFiles.mock.calls[0][1].map((f: any) => f.path)).toEqual(
      expect.arrayContaining(['AGENTS.md', 'TEMPLATE.tex']),
    );
    expect(sandbox.exec).not.toHaveBeenCalled();
    expect(result.templateKey).toBe('modern-sans');
    expect(result.revision).toBe(0);
    expect(result.canRevert).toBe(false);
  });

  it('does not spend a turn when the selected look is already active', async () => {
    const session = await service.startSession('u1', {
      harness: 'codex',
      templateKey: 'modern-sans',
    });
    sandbox.exec.mockClear();

    const result = await service.selectTemplate('u1', session.id, {
      templateKey: 'modern-sans',
    });

    expect(sandbox.exec).not.toHaveBeenCalled();
    expect(result.revision).toBe(0);
    expect(result.canRevert).toBe(false);
  });

  it('does not leak another user’s session through the look endpoints', async () => {
    const session = await startGenerated();
    await expect(
      service.selectTemplate('someone-else', session.id, {
        templateKey: 'modern-sans',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
