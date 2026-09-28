import { ServiceUnavailableException } from '@nestjs/common';
import { LiteLlmCandidateResumeReviewAgent } from './candidate-resume-review.agent';

describe('LiteLlmCandidateResumeReviewAgent session runtime', () => {
  const aliases = { resolveAutomaticForUser: jest.fn() };
  const budget = { withCandidateLease: jest.fn() };
  const quota = { enforceQuota: jest.fn(), consumeCredit: jest.fn() };
  const adapter = {
    id: 'opencode', displayName: 'OpenCode', bootstrap: jest.fn(),
    turnCommand: jest.fn(), parseOutput: jest.fn(),
  };
  const registry = { forProvider: jest.fn(() => adapter) };
  const sandbox = { provision: jest.fn(), writeFiles: jest.fn(), exec: jest.fn(), destroy: jest.fn() };
  const matcher = { analyze: jest.fn() };
  const session = {
    _id: 'compare-session-1', status: 'provisioning', sandboxId: undefined as string | undefined,
    failureReason: undefined as string | undefined,
    save: jest.fn(),
  };
  const sessionModel = { create: jest.fn(), findOne: jest.fn() };
  let agent: LiteLlmCandidateResumeReviewAgent;

  const reviewJson = (annotations: any[]) => JSON.stringify({
    atsExplanation: 'Sections are machine-readable but some bullets need detail.',
    matchExplanation: 'The resume shows TypeScript but lacks AWS evidence.',
    matched: ['TypeScript'], missing: ['AWS'], annotations,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    aliases.resolveAutomaticForUser.mockResolvedValue({
      alias: 'bedrock/nova-2-lite/low', provider: 'bedrock', model: 'nova-2-lite',
      effort: 'low', label: 'Nova 2 Lite', maxOutputTokens: 4096, maxInputTokens: 128000,
    });
    budget.withCandidateLease.mockImplementation(async (_u, _s, _a, run) =>
      run({ apiKey: 'candidate-key' }, ['usageContext=candidate_ats_review']),
    );
    quota.enforceQuota.mockResolvedValue(undefined);
    quota.consumeCredit.mockResolvedValue(undefined);
    adapter.bootstrap.mockImplementation((input: any) => ({ env: { HOME: '/workspace' }, files: input.contextFiles, command: ['agent'] }));
    adapter.turnCommand.mockReturnValue(['agent', 'review']);
    adapter.parseOutput.mockImplementation((stdout: string) => ({ response: stdout, activities: [] }));
    sandbox.provision.mockResolvedValue({ sandboxId: 'candidate-ats-box-1' });
    sandbox.writeFiles.mockResolvedValue(undefined);
    sandbox.destroy.mockResolvedValue(undefined);
    matcher.analyze.mockResolvedValue({
      semanticMatch: 67,
      subScores: { keywordMatch: 64, skillsCoverage: 70, sectionCompleteness: 82 },
      keywordGaps: ['AWS'], injectableKeywords: [], suggestions: ['Clarify impact.'],
    });
    session.status = 'provisioning';
    session.sandboxId = undefined;
    session.failureReason = undefined;
    session.save.mockResolvedValue(undefined);
    sessionModel.create.mockResolvedValue(session);
    sessionModel.findOne.mockReturnValue({ sort: () => ({ lean: () => ({ exec: async () => null }) }) });
    sandbox.exec.mockResolvedValue({
      exitCode: 0, stderr: '', stdout: reviewJson([
        { id: 'one', section: 'experience', severity: 'warning', message: 'Too vague', fix: 'Name the outcome', quote: 'Built payment services for clients' },
      ]),
    });
    agent = new (LiteLlmCandidateResumeReviewAgent as any)(
      sessionModel, aliases, budget, quota, registry, sandbox, matcher,
    );
  });

  it('runs Resume-Matcher and the detailed reviewer inside one persisted agent sandbox session', async () => {
    const result = await agent.review({
      userId: 'user-1', resumeId: 'resume-1', resumeText: 'Built payment services for clients',
      jobDescription: 'TypeScript and AWS',
    } as any);

    expect(sessionModel.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1', resumeId: 'resume-1', status: 'provisioning', harness: 'opencode',
    }));
    expect(aliases.resolveAutomaticForUser).toHaveBeenCalledWith('user-1');
    expect(sandbox.provision).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 'compare-session-1', harness: 'opencode',
    }));
    expect(matcher.analyze).toHaveBeenCalledWith(expect.objectContaining({
      sandboxId: 'candidate-ats-box-1', alias: 'bedrock/nova-2-lite/low',
    }));
    expect(adapter.turnCommand).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({
      source: 'agent-session', sessionId: 'compare-session-1', harness: 'opencode',
      ats: expect.objectContaining({ score: 82 }),
      match: expect.objectContaining({ coverage: 67, missing: ['AWS'] }),
      annotations: [expect.objectContaining({ quote: 'Built payment services for clients' })],
    }));
    expect(quota.consumeCredit).not.toHaveBeenCalled();
    expect(sandbox.destroy).toHaveBeenCalledWith('candidate-ats-box-1');
  });

  it('preserves a valid saved review when usage reconciliation is temporarily unavailable', async () => {
    budget.withCandidateLease.mockImplementation(async (_u, _s, _a, run) => {
      await run({ apiKey: 'candidate-key' }, []);
      throw Object.assign(new Error('Usage is being reconciled'), { code: 'AI_USAGE_RECONCILING' });
    });
    const result = await agent.review({ userId: 'user-1', resumeId: 'resume-1', resumeText: 'Built payment services for clients', jobDescription: 'TypeScript' });
    expect(result.annotations).toHaveLength(1);
    expect(session.status).toBe('completed');
    expect(sandbox.destroy).toHaveBeenCalled();
  });

  it('places an original binary PDF in the temporary agent workspace', async () => {
    const bytes = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0xff]);
    await agent.review({
      userId: 'user-1', resumeId: 'resume-1', resumeText: 'Built payment services for clients',
      jobDescription: 'TypeScript and AWS', originalFile: { filename: 'source.pdf', bytes },
    });
    expect(sandbox.provision).toHaveBeenCalledWith(expect.objectContaining({
      files: expect.arrayContaining([
        { path: 'ORIGINAL_RESUME.pdf', bytes },
      ]),
    }));
  });

  it('rejects invented metrics in a fix even when its quotation is grounded', async () => {
    sandbox.exec.mockResolvedValueOnce({ exitCode: 0, stderr: '', stdout: reviewJson([
      { id: 'bad', section: 'experience', severity: 'warning', message: 'Add reliability', fix: 'Achieved 99.95% uptime for 500 customers', quote: 'Built payment services for clients' },
    ]) });
    const result = await agent.review({ userId: 'user-1', resumeId: 'resume-1', resumeText: 'Built payment services for clients', jobDescription: 'Reliable backend services' });
    expect(result.annotations.map(a => a.fix).join(' ')).not.toMatch(/99\.95|500/);
    expect(sandbox.exec).toHaveBeenCalledTimes(2);
    const rules = adapter.bootstrap.mock.calls[0][0].contextFiles.find((file: any) => file.path === 'AGENTS.md').contents;
    expect(rules).toMatch(/only if.*true/i);
  });

  it('rejects invented replacement claims without numeric metrics', async () => {
    sandbox.exec.mockResolvedValueOnce({ exitCode: 0, stdout: reviewJson([
      { id: 'bad', section: 'experience', message: 'Missing collaboration', fix: "Add a collaboration-focused bullet: 'Led code reviews and contributed to team standardization on TypeScript patterns, improving code quality and reducing onboarding time for junior engineers.'", quote: 'Built payment services for clients' },
    ]) });
    const result = await agent.review({ userId: 'user-1', resumeId: 'resume-1', resumeText: 'Built payment services for clients', jobDescription: 'Reliable backend services' });
    expect(result.annotations.map(a => a.fix).join(' ')).not.toContain('Led code reviews');
    expect(sandbox.exec).toHaveBeenCalledTimes(2);
  });

  it('rejects fill-in-the-blank achievements instead of presenting them as fixes', async () => {
    sandbox.exec.mockResolvedValueOnce({ exitCode: 0, stderr: '', stdout: reviewJson([
      { id: 'bad', section: 'experience', severity: 'warning', message: 'Clarify impact', fix: 'Improved throughput by X% and enabled daily reconciliation cycles.', quote: 'Built payment services for clients' },
    ]) });
    const result = await agent.review({ userId: 'user-1', resumeId: 'resume-1', resumeText: 'Built payment services for clients', jobDescription: 'Reliable backend services' });
    expect(result.annotations.map(a => a.fix).join(' ')).not.toContain('X%');
    expect(sandbox.exec).toHaveBeenCalledTimes(2);
  });

  it('rejects a contact-only verdict when source text visibly contains professional sections', async () => {
    matcher.analyze.mockResolvedValueOnce({
      semanticMatch: 0,
      subScores: { keywordMatch: 0, skillsCoverage: 0, sectionCompleteness: 0 },
      keywordGaps: [], injectableKeywords: [], suggestions: [],
    });
    sandbox.exec.mockResolvedValue({ exitCode: 0, stderr: '', stdout: reviewJson([
      { id: 'one', section: 'personal', severity: 'critical', message: 'Only contact details', fix: 'Add experience', quote: 'john.doe@example.com' },
    ]).replace('Sections are machine-readable but some bullets need detail.', 'The resume contains only contact information') });
    await expect(agent.review({
      userId: 'user-1', resumeId: 'resume-1',
      resumeText: 'John Doe\njohn.doe@example.com\nSummary\nDeveloper with experience deploying containerised services.\nExperience\nSoftware Engineer at Example Co\nDeployed 8 Kubernetes services.',
      jobDescription: 'Kubernetes engineer',
    })).rejects.toThrow(/contradicts the original résumé/i);
  });

  it('reuses a completed identical review on reopen without consuming another credit', async () => {
    const prior = {
      result: {
        source: 'agent-session', sessionId: 'earlier-session', harness: 'claude-code',
        modelAlias: 'anthropic/claude-haiku-4-5/low', ats: { score: 70, findings: [] },
        match: { coverage: 60, matched: [], missing: [], keywordCount: 0 }, annotations: [],
      },
    };
    sessionModel.findOne.mockReturnValue({ sort: () => ({ lean: () => ({ exec: async () => prior }) }) });
    const result = await agent.review({
      userId: 'user-1', resumeId: 'resume-1', resumeText: 'Built payment services for clients',
      jobDescription: 'Backend engineer',
    });
    expect(result.sessionId).toBe('earlier-session');
    expect(sessionModel.create).not.toHaveBeenCalled();
    expect(quota.consumeCredit).not.toHaveBeenCalled();
    expect(sandbox.provision).not.toHaveBeenCalled();
  });

  it('starts a new paid review only when refresh is explicitly requested', async () => {
    const result = await agent.review({
      userId: 'user-1', resumeId: 'resume-1', resumeText: 'Built payment services for clients',
      jobDescription: 'Backend engineer',
    }, { forceRefresh: true });
    expect(result.sessionId).toBe('compare-session-1');
    expect(sessionModel.findOne).not.toHaveBeenCalled();
    expect(quota.consumeCredit).not.toHaveBeenCalled();
  });

  it('uses remaining configured turns to complete grounded coverage', async () => {
    const lines = ['Built payment services for clients', 'Reduced deployment time with automation', 'Documented production support workflows'];
    const item = (quote: string, i: number) => ({ id: 'item-' + i, section: 'experience', message: 'Clarify impact', fix: 'Describe the factual outcome', quote });
    sandbox.exec.mockResolvedValueOnce({ exitCode: 0, stdout: reviewJson([item(lines[0], 0)]) })
      .mockResolvedValueOnce({ exitCode: 0, stdout: reviewJson([item(lines[1], 1)]) })
      .mockResolvedValueOnce({ exitCode: 0, stdout: reviewJson([item(lines[2], 2)]) });
    const result = await agent.review({ userId: 'user-1', resumeId: 'resume-1', resumeText: lines.join('\n'), jobDescription: 'Backend engineer' });
    expect(result.annotations).toHaveLength(3);
    expect(sandbox.exec).toHaveBeenCalledTimes(3);
  });

  it('continues the same sandbox session when exact quote coverage needs repair', async () => {
    sandbox.exec
      .mockResolvedValueOnce({ exitCode: 0, stderr: '', stdout: reviewJson([
        { id: 'bad', section: 'experience', severity: 'warning', message: 'Vague', fix: 'Clarify', quote: 'Text not in resume' },
      ]) })
      .mockResolvedValueOnce({ exitCode: 0, stderr: '', stdout: reviewJson([
        { id: 'one', section: 'experience', severity: 'warning', message: 'Vague', fix: 'Clarify', quote: 'Built payment services for clients' },
        { id: 'two', section: 'experience', severity: 'warning', message: 'Thin', fix: 'Name mechanism', quote: 'Reduced deployment time with automation' },
        { id: 'three', section: 'experience', severity: 'warning', message: 'Impact missing', fix: 'State outcome', quote: 'Documented production support workflows' },
      ]) });

    const result = await agent.review({
      userId: 'user-1', resumeId: 'resume-1',
      resumeText: ['Built payment services for clients', 'Reduced deployment time with automation', 'Documented production support workflows'].join('\n'),
      jobDescription: 'Backend engineer',
    } as any);

    expect(sandbox.provision).toHaveBeenCalledTimes(1);
    expect(sandbox.exec).toHaveBeenCalledTimes(2);
    expect(adapter.turnCommand.mock.calls[1][1]).toContain('REPAIR REQUIRED');
    expect(result.annotations).toHaveLength(3);
    expect(quota.consumeCredit).not.toHaveBeenCalled();
  });

  it('does not deduct a credit when the session returns invalid review output', async () => {
    sandbox.exec.mockResolvedValue({ exitCode: 0, stderr: '', stdout: 'not json' });
    await expect(agent.review({
      userId: 'user-1', resumeId: 'resume-1', resumeText: 'Resume text', jobDescription: 'Job',
    } as any)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(quota.consumeCredit).not.toHaveBeenCalled();
    expect(sandbox.exec).toHaveBeenCalledTimes(2);
    expect(session.failureReason).toBe('INVALID_REVIEW_JSON');
    expect(sandbox.destroy).toHaveBeenCalled();
  });

  it('repairs malformed JSON in the same session before completing and charging once', async () => {
    sandbox.exec
      .mockResolvedValueOnce({ exitCode: 0, stderr: '', stdout: '{"annotations": [' })
      .mockResolvedValueOnce({ exitCode: 0, stderr: '', stdout: `Here is the review:\n\x60\x60\x60json\n${reviewJson([
        { id: 'one', section: 'experience', severity: 'warning', message: 'Thin result', fix: 'Name the outcome', quote: 'Built payment services for clients' },
      ])}\n\x60\x60\x60` });
    const result = await agent.review({
      userId: 'user-1', resumeId: 'resume-1', resumeText: 'Built payment services for clients', jobDescription: 'Backend engineer',
    });
    expect(sandbox.exec).toHaveBeenCalledTimes(2);
    expect(adapter.turnCommand.mock.calls[1][1]).toContain('JSON');
    expect(result.annotations).toHaveLength(1);
    expect(quota.consumeCredit).not.toHaveBeenCalled();
  });

  it('does not present or charge a sparse review as complete', async () => {
    sandbox.exec.mockResolvedValue({ exitCode: 0, stderr: '', stdout: reviewJson([
      { id: 'one', section: 'experience', severity: 'warning', message: 'Thin result', fix: 'Name the outcome', quote: 'Built payment services for clients' },
    ]) });
    await expect(agent.review({
      userId: 'user-1', resumeId: 'resume-1',
      resumeText: 'Built payment services for clients\nReduced deployment time with automation\nDocumented production support workflows',
      jobDescription: 'Backend engineer',
    })).rejects.toThrow(/grounded comments/);
    expect(sandbox.exec).toHaveBeenCalledTimes(3);
    expect(quota.consumeCredit).not.toHaveBeenCalled();
    expect(session.status).toBe('failed');
  });

  it('does not count a quoted annotation without an actionable fix as a completed comment', async () => {
    sandbox.exec.mockResolvedValue({ exitCode: 0, stderr: '', stdout: reviewJson([
      { id: 'one', section: 'experience', severity: 'warning', message: 'Thin result', fix: '', quote: 'Built payment services for clients' },
    ]) });
    await expect(agent.review({
      userId: 'user-1', resumeId: 'resume-1', resumeText: 'Built payment services for clients',
      jobDescription: 'Backend engineer',
    })).rejects.toThrow(/grounded comments/);
    expect(quota.consumeCredit).not.toHaveBeenCalled();
  });

  it('caps all JSON and quote-repair turns at three model calls total', async () => {
    sandbox.exec
      .mockResolvedValueOnce({ exitCode: 0, stderr: '', stdout: '{"annotations": [' })
      .mockResolvedValueOnce({ exitCode: 0, stderr: '', stdout: reviewJson([
        { id: 'bad', section: 'experience', severity: 'warning', message: 'Thin result', fix: 'Name outcome', quote: 'Not in the resume' },
      ]) })
      .mockResolvedValue({ exitCode: 0, stderr: '', stdout: '{"annotations": [' });
    await expect(agent.review({
      userId: 'user-1', resumeId: 'resume-1', resumeText: 'Built payment services for clients',
      jobDescription: 'Backend engineer',
    })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(sandbox.exec.mock.calls.length).toBeLessThanOrEqual(3);
    expect(quota.consumeCredit).not.toHaveBeenCalled();
  });

  it('honors the configured review-turn cap across repair types', async () => {
    const previous = process.env.CANDIDATE_ATS_MAX_REVIEW_TURNS;
    process.env.CANDIDATE_ATS_MAX_REVIEW_TURNS = '2';
    sandbox.exec
      .mockResolvedValueOnce({ exitCode: 0, stderr: '', stdout: '{"annotations": [' })
      .mockResolvedValue({ exitCode: 0, stderr: '', stdout: reviewJson([
        { id: 'bad', section: 'experience', severity: 'warning', message: 'Thin result', fix: 'Name outcome', quote: 'Not in the resume' },
      ]) });
    try {
      await expect(agent.review({
        userId: 'user-1', resumeId: 'resume-1', resumeText: 'Built payment services for clients',
        jobDescription: 'Backend engineer',
      })).rejects.toThrow(/2-turn retry limit/);
      expect(sandbox.exec).toHaveBeenCalledTimes(2);
      expect(session.failureReason).toBe('REVIEW_RETRY_LIMIT_EXHAUSTED');
      expect(quota.consumeCredit).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.CANDIDATE_ATS_MAX_REVIEW_TURNS;
      else process.env.CANDIDATE_ATS_MAX_REVIEW_TURNS = previous;
    }
  });

  it('rejects an invalid retry setting before provisioning or charging', async () => {
    const previous = process.env.CANDIDATE_ATS_MAX_REVIEW_TURNS;
    process.env.CANDIDATE_ATS_MAX_REVIEW_TURNS = 'unlimited';
    try {
      await expect(agent.review({
        userId: 'user-1', resumeId: 'resume-1', resumeText: 'Built payment services for clients',
        jobDescription: 'Backend engineer',
      })).rejects.toThrow(/Invalid ATS retry configuration/);
      expect(sessionModel.create).not.toHaveBeenCalled();
      expect(quota.consumeCredit).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.CANDIDATE_ATS_MAX_REVIEW_TURNS;
      else process.env.CANDIDATE_ATS_MAX_REVIEW_TURNS = previous;
    }
  });

  it('reports an empty harness result as missing review rather than invalid JSON', async () => {
    adapter.parseOutput.mockReturnValue({ activities: [] });
    sandbox.exec.mockResolvedValue({ exitCode: 0, stderr: '', stdout: '{"type":"result","result":""}' });
    await expect(agent.review({
      userId: 'user-1', resumeId: 'resume-1', resumeText: 'Built payment services for clients',
      jobDescription: 'Backend engineer',
    })).rejects.toThrow(/returned no review/);
    expect(quota.consumeCredit).not.toHaveBeenCalled();
  });

  it('does not provision a session when the measured credit balance is exhausted', async () => {
    budget.withCandidateLease.mockRejectedValueOnce(new Error('AI credits exhausted'));
    await expect(agent.review({
      userId: 'user-1', resumeId: 'resume-1', resumeText: 'Resume', jobDescription: 'Job',
    } as any)).rejects.toThrow('AI credits exhausted');
    expect(sessionModel.create).toHaveBeenCalled();
    expect(sandbox.provision).not.toHaveBeenCalled();
  });
});
