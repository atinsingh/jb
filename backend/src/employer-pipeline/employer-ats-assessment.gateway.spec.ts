import { EmployerAtsGateway } from './employer-ats-assessment.gateway';

const input = {
  ownerId: 'employer-1',
  runId: 'assessment-1',
  applicationId: 'application-1',
  resumeArtifactId: 'artifact-1',
  resumeVersion: 7,
  resumeHash: 'resume-hash',
  resumeContent: '{"summary":"Backend engineer"}',
  jobId: 'job-1',
  jobDescription: 'Build backend services.',
  jobDescriptionHash: 'job-hash',
};

describe('EmployerAtsGateway', () => {
  const runtime = {
    prepare: jest.fn(),
    finish: jest.fn(),
  };
  const matcher = { analyze: jest.fn() };
  let gateway: EmployerAtsGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    runtime.prepare.mockResolvedValue({
      status: 'READY',
      ownerId: input.ownerId,
      runId: input.runId,
      sandboxId: 'employer-box-1',
      alias: 'bedrock/nova-2-lite/low',
      provider: 'bedrock',
      effort: 'low',
      keyAlias: 'jobocate-employer-employer-1',
      virtualKey: 'sk-employer-only',
      spendBeforeUsd: 0.1,
      startedAt: new Date('2026-09-15T10:00:00Z'),
    });
    matcher.analyze.mockResolvedValue({
      semanticMatch: 78,
      subScores: {
        keywordMatch: 80,
        skillsCoverage: 76,
        sectionCompleteness: 74,
      },
      keywordGaps: ['Kubernetes'],
      injectableKeywords: ['observability'],
      suggestions: ['Add measurable outcomes.'],
    });
    runtime.finish.mockResolvedValue({
      costUsd: 0.04,
      requestIds: ['chatcmpl-1'],
    });
    gateway = new EmployerAtsGateway(runtime as any, matcher as any);
  });

  it('runs Resume-Matcher inside the employer sandbox and preserves its 0-100 scores', async () => {
    const result = await gateway.assess(input);

    expect(matcher.analyze).toHaveBeenCalledWith({
      sandboxId: 'employer-box-1',
      latex: input.resumeContent,
      jobDescription: input.jobDescription,
      sourceRevision: 7,
      alias: 'bedrock/nova-2-lite/low',
    });
    expect(result).toEqual({
      status: 'COMPLETE',
      semanticMatch: 78,
      subScores: {
        keywordMatch: 80,
        skillsCoverage: 76,
        sectionCompleteness: 74,
      },
      gaps: ['Kubernetes'],
      suggestions: ['Add measurable outcomes.'],
      modelAlias: 'bedrock/nova-2-lite/low',
      effort: 'low',
      harness: 'ats',
      sourceRunId: 'assessment-1',
      costUsd: 0.04,
      requestIds: ['chatcmpl-1'],
    });
    expect(runtime.finish).toHaveBeenCalledWith(
      expect.objectContaining({ runId: 'assessment-1' }),
      { succeeded: true },
    );
  });

  it('does not dispatch Resume-Matcher when the employer pool is exhausted', async () => {
    runtime.prepare.mockResolvedValue({
      status: 'BUDGET_EXHAUSTED',
      reason: 'EMPLOYER_BUDGET_EXHAUSTED',
      limitUsd: 1,
      spentUsd: 1,
      remainingUsd: 0,
      period: 'monthly',
    });

    const result = await gateway.assess(input);

    expect(result).toEqual(
      expect.objectContaining({
        status: 'BUDGET_EXHAUSTED',
        reason: 'EMPLOYER_BUDGET_EXHAUSTED',
        remainingUsd: 0,
      }),
    );
    expect(matcher.analyze).not.toHaveBeenCalled();
    expect(runtime.finish).not.toHaveBeenCalled();
  });

  it('returns a typed configuration state without exposing the management error', async () => {
    runtime.prepare.mockRejectedValue(new Error('secret proxy failure body'));

    const result = await gateway.assess(input);

    expect(result).toEqual({
      status: 'CONFIGURATION_ERROR',
      reason: 'EMPLOYER_ATS_CONFIGURATION_ERROR',
      harness: 'ats',
      sourceRunId: 'assessment-1',
    });
    expect(JSON.stringify(result)).not.toContain('secret proxy failure body');
  });

  it('reconciles actual spend after provider failure without returning a complete ATS result', async () => {
    matcher.analyze.mockRejectedValue(new Error('provider payload must stay private'));
    runtime.finish.mockResolvedValue({
      costUsd: 0.02,
      requestIds: ['chatcmpl-failed'],
    });

    const result = await gateway.assess(input);

    expect(runtime.finish).toHaveBeenCalledWith(expect.any(Object), {
      succeeded: false,
    });
    expect(result).toEqual({
      status: 'ATS_FAILED',
      reason: 'EMPLOYER_ATS_EXECUTION_FAILED',
      modelAlias: 'bedrock/nova-2-lite/low',
      effort: 'low',
      harness: 'ats',
      sourceRunId: 'assessment-1',
      costUsd: 0.02,
      requestIds: ['chatcmpl-failed'],
    });
  });

  it('does not finalize the same run twice when accounting persistence fails', async () => {
    runtime.finish.mockRejectedValueOnce(new Error('usage storage unavailable'));

    const result = await gateway.assess(input);

    expect(runtime.finish).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      status: 'ATS_FAILED',
      reason: 'EMPLOYER_ATS_ACCOUNTING_FAILED',
      modelAlias: 'bedrock/nova-2-lite/low',
      effort: 'low',
      harness: 'ats',
      sourceRunId: 'assessment-1',
    });
  });
});
