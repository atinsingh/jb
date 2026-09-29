import { ConflictException, NotFoundException } from '@nestjs/common';
import { AtsSessionService } from '../ats-session.service';
import { ResumeMatcherAdapter } from '../resume-matcher.adapter';

const USER_ID = '507f1f77bcf86cd799439011';

describe('AtsSessionService', () => {
  let atsRows: any[];
  let resumeRows: any[];
  let adapter: jest.Mocked<ResumeMatcherAdapter>;
  let quota: { enforceQuota: jest.Mock; consumeCredit: jest.Mock };
  let service: AtsSessionService;
  let budget: any;
  let aliases: any;

  const query = (value: any) => ({ exec: async () => value });

  beforeEach(() => {
    atsRows = [];
    resumeRows = [{
      _id: '507f1f77bcf86cd799439012',
      userId: USER_ID,
      status: 'active',
      sandboxId: 'resume-box-1',
      revision: 2,
      latex: '\\documentclass{article}\\begin{document}Jordan Reyes\\end{document}',
      jobDescription: 'Senior TypeScript engineer',
      harness: 'codex',
      alias: 'openai/gpt-5/high',
    }];

    const atsModel: any = {
      create: jest.fn(async (doc: any) => {
        const row = {
          ...doc,
          _id: `ats-${atsRows.length + 1}`,
          save: jest.fn(async function (this: any) { return this; }),
        };
        atsRows.push(row);
        return row;
      }),
      findOne: jest.fn((filter: any) => query(atsRows.find((row) =>
        (!filter._id || String(row._id) === String(filter._id)) &&
        (!filter.userId || String(row.userId) === String(filter.userId)) &&
        (!filter.resumeSessionId || String(row.resumeSessionId) === String(filter.resumeSessionId)),
      ) || null)),
      deleteOne: jest.fn((filter: any) => ({ exec: async () => {
        const before = atsRows.length;
        atsRows = atsRows.filter((row) => !(String(row._id) === String(filter._id) && String(row.userId) === String(filter.userId)));
        return { deletedCount: before - atsRows.length };
      } })),
    };
    const resumeModel: any = {
      findOne: jest.fn((filter: any) => query(resumeRows.find((row) =>
        String(row._id) === String(filter._id) && String(row.userId) === String(filter.userId),
      ) || null)),
    };
    adapter = {
      analyze: jest.fn(async (_input) => ({
        semanticMatch: 78.5,
        subScores: { keywordMatch: 80, skillsCoverage: 75, sectionCompleteness: 80 },
        keywordGaps: ['Kubernetes'],
        injectableKeywords: ['Docker'],
        suggestions: ['Add Kubernetes evidence.'],
      })),
    };
    quota = {
      enforceQuota: jest.fn().mockResolvedValue(undefined),
      consumeCredit: jest.fn().mockResolvedValue(undefined),
    };
    budget = { withCandidateLease: jest.fn(async (_owner, _service, _attribution, task) => task({ apiKey: 'sk-candidate' }, ['logicalRunId=ats-test'])) };
    aliases = { resolveAutomaticForUser: jest.fn().mockResolvedValue({
      alias: 'anthropic/claude-sonnet-4-6/low', harness: 'claude-code',
      model: 'claude-sonnet-4-6', effort: 'low',
    }) };
    service = new AtsSessionService(atsModel, resumeModel, adapter, budget, aliases);
  });

  it('runs Resume-Matcher in the existing resume sandbox and persists its values unchanged', async () => {
    const started = await service.start(USER_ID, {
      resumeSessionId: resumeRows[0]._id,
      sourceRevision: 2,
      jobDescription: 'Senior TypeScript engineer',
    });

    const result = await service.run(USER_ID, started.id);

    expect(adapter.analyze).toHaveBeenCalledWith(expect.objectContaining({
      sandboxId: 'resume-box-1',
      sourceRevision: 2,
      alias: 'anthropic/claude-sonnet-4-6/low',
    }));
    expect(result).toEqual(expect.objectContaining({
      semanticMatch: 78.5,
      keywordGaps: ['Kubernetes'],
      suggestions: ['Add Kubernetes evidence.'],
      sourceRevision: 2,
      stale: false,
    }));
    expect(budget.withCandidateLease).toHaveBeenCalledWith(USER_ID, 'candidate_ats_review', expect.objectContaining({ alias: 'anthropic/claude-sonnet-4-6/low', model: 'claude-sonnet-4-6', effort: 'low' }), expect.any(Function));
    expect(quota.enforceQuota).not.toHaveBeenCalled();
    expect(quota.consumeCredit).not.toHaveBeenCalled();
  });

  it('uses the current automatic default when retrying an existing ATS session', async () => {
    const started = await service.start(USER_ID, { resumeSessionId: resumeRows[0]._id, sourceRevision: 2, jobDescription: 'Engineer' });
    expect(started.alias).toBe('anthropic/claude-sonnet-4-6/low');
    atsRows[0].alias = resumeRows[0].alias;
    atsRows[0].status = 'failed';
    const result = await service.run(USER_ID, started.id);
    expect(result).toMatchObject({ status: 'completed', alias: 'anthropic/claude-sonnet-4-6/low' });
    expect(aliases.resolveAutomaticForUser).toHaveBeenCalledWith(USER_ID);
    expect(resumeRows[0].alias).toBe('openai/gpt-5/high');
  });

  it('returns a failed analysis as recoverable session state instead of an HTTP error', async () => {
    adapter.analyze.mockRejectedValueOnce(
      new Error('ATS analysis is temporarily unavailable.'),
    );
    const started = await service.start(USER_ID, {
      resumeSessionId: resumeRows[0]._id,
      sourceRevision: 2,
      jobDescription: 'Senior TypeScript engineer',
    });

    await expect(service.run(USER_ID, started.id)).resolves.toEqual(
      expect.objectContaining({
        status: 'failed',
        unavailableReason: 'ATS analysis is temporarily unavailable.',
      }),
    );
    expect(quota.consumeCredit).not.toHaveBeenCalled();
  });

  it('fails closed before ATS dispatch when measured credits are exhausted', async () => {
    const started = await service.start(USER_ID, { resumeSessionId: resumeRows[0]._id, sourceRevision: 2, jobDescription: 'Engineer' });
    budget.withCandidateLease.mockRejectedValueOnce(new Error('AI credits exhausted'));
    await expect(service.run(USER_ID, started.id)).resolves.toMatchObject({ status: 'failed', unavailableReason: 'AI credits exhausted' });
    expect(adapter.analyze).not.toHaveBeenCalled();
  });

  it('does not use the legacy action counter for ATS', async () => {
    const started = await service.start(USER_ID, {
      resumeSessionId: resumeRows[0]._id,
      sourceRevision: 2,
      jobDescription: 'Senior TypeScript engineer',
    });
    quota.enforceQuota.mockRejectedValueOnce(new Error('AI credits exhausted'));

    await expect(service.run(USER_ID, started.id)).resolves.toMatchObject({ status: 'completed' });

    expect(adapter.analyze).toHaveBeenCalled();
    expect(quota.consumeCredit).not.toHaveBeenCalled();
    expect(atsRows[0].status).toBe('completed');
  });

  it('marks a persisted result stale when the resume revision advances', async () => {
    const started = await service.start(USER_ID, {
      resumeSessionId: resumeRows[0]._id,
      sourceRevision: 2,
      jobDescription: 'Senior TypeScript engineer',
    });
    await service.run(USER_ID, started.id);
    resumeRows[0].revision = 3;

    await expect(service.get(USER_ID, started.id)).resolves.toEqual(
      expect.objectContaining({ sourceRevision: 2, currentRevision: 3, stale: true }),
    );
  });

  it('does not analyze an ended resume session without a live user sandbox', async () => {
    resumeRows[0].status = 'ended';
    resumeRows[0].sandboxId = undefined;

    await expect(service.start(USER_ID, {
      resumeSessionId: resumeRows[0]._id,
      sourceRevision: 2,
      jobDescription: 'Senior TypeScript engineer',
    })).rejects.toBeInstanceOf(ConflictException);
    expect(adapter.analyze).not.toHaveBeenCalled();
  });

  it('rejects an empty job description before creating an ATS session', async () => {
    await expect(service.start(USER_ID, {
      resumeSessionId: resumeRows[0]._id,
      sourceRevision: 2,
      jobDescription: '   ',
    })).rejects.toThrow('A job description is required');
    expect(atsRows).toHaveLength(0);
  });

  it('hides foreign resume and ATS session identifiers behind not found', async () => {
    await expect(service.start('507f1f77bcf86cd799439099', {
      resumeSessionId: resumeRows[0]._id,
      sourceRevision: 2,
      jobDescription: 'Senior TypeScript engineer',
    })).rejects.toBeInstanceOf(NotFoundException);

    const started = await service.start(USER_ID, {
      resumeSessionId: resumeRows[0]._id,
      sourceRevision: 2,
      jobDescription: 'Senior TypeScript engineer',
    });
    await expect(service.get('507f1f77bcf86cd799439099', started.id))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('ending and deleting ATS state never tears down the shared resume sandbox', async () => {
    const started = await service.start(USER_ID, {
      resumeSessionId: resumeRows[0]._id,
      sourceRevision: 2,
      jobDescription: 'Senior TypeScript engineer',
    });

    await expect(service.end(USER_ID, started.id)).resolves.toEqual(
      expect.objectContaining({ status: 'ended' }),
    );
    await expect(service.delete(USER_ID, started.id)).resolves.toBeUndefined();
    expect(atsRows).toHaveLength(0);
    expect(adapter.analyze).not.toHaveBeenCalled();
  });
});
