import { ServiceUnavailableException } from '@nestjs/common';
import {
  AtsSandboxReleasedException,
  InSandboxResumeMatcherAdapter,
} from '../resume-matcher.adapter';

describe('InSandboxResumeMatcherAdapter', () => {
  const sandbox: any = {
    writeFiles: jest.fn(async () => undefined),
    exec: jest.fn(),
    provision: jest.fn(),
    destroy: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('returns Resume-Matcher score semantics unchanged and reuses the supplied sandbox', async () => {
    sandbox.exec.mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({
        overall_score: 72.4,
        sub_scores: { keyword_match: 70, skills_coverage: 75, section_completeness: 75 },
        missing_keywords: ['Kubernetes'],
        injectable_keywords: ['Docker'],
        recommendations: ['Add Kubernetes evidence.'],
      }),
      stderr: '',
    });
    const adapter = new InSandboxResumeMatcherAdapter(sandbox);

    const result = await adapter.analyze({
      sandboxId: 'resume-box-1',
      latex: '\\documentclass{article}',
      jobDescription: 'Kubernetes engineer',
      sourceRevision: 4,
      alias: 'openai/gpt-5/high',
    });

    expect(sandbox.writeFiles).toHaveBeenCalledWith('resume-box-1', [expect.objectContaining({ path: '.jobocate-ats/input.json' })]);
    expect(sandbox.exec).toHaveBeenCalledWith('resume-box-1', expect.arrayContaining(['python', '/opt/resume-matcher/jobocate_ats.py']), expect.any(Object));
    expect(sandbox.provision).not.toHaveBeenCalled();
    expect(sandbox.destroy).not.toHaveBeenCalled();
    expect(result).toEqual({
      semanticMatch: 72.4,
      subScores: { keywordMatch: 70, skillsCoverage: 75, sectionCompleteness: 75 },
      keywordGaps: ['Kubernetes'],
      injectableKeywords: ['Docker'],
      suggestions: ['Add Kubernetes evidence.'],
    });
  });

  it('returns a typed unavailable failure when the in-sandbox runtime cannot execute', async () => {
    sandbox.exec.mockResolvedValue({ exitCode: 127, stdout: '', stderr: 'python: not found' });
    const adapter = new InSandboxResumeMatcherAdapter(sandbox);

    await expect(adapter.analyze({
      sandboxId: 'resume-box-1',
      latex: 'resume',
      jobDescription: 'job',
      sourceRevision: 1,
      alias: 'model',
    })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('treats a missing sandbox container as a client release, not a matcher execution failure', async () => {
    sandbox.exec.mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'Error: No such container: jb-resume-employer-1',
    });
    const adapter = new InSandboxResumeMatcherAdapter(sandbox);

    await expect(
      adapter.analyze({
        sandboxId: 'jb-resume-employer-1',
        latex: 'resume',
        jobDescription: 'job',
        sourceRevision: 1,
        alias: 'model',
      }),
    ).rejects.toBeInstanceOf(AtsSandboxReleasedException);
  });
});
